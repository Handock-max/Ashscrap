/**
 * Cloudflare Worker - Ash Scrap Extraction
 * Workflow en 4 étapes avec reprise automatique et pagination
 * APIs: OpenStreetMap → Apollo → Apollo Enrichment → Kaspr
 */

const BATCH_SIZE = 500;
const MAX_PAGES = 20;
const STEP_TIMEOUT = 25000; // 25 secondes max par étape

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/extract' && request.method === 'POST') {
        return await handleExtraction(request, env, corsHeaders);
      }

      if (url.pathname === '/status' && request.method === 'GET') {
        const extractionId = url.searchParams.get('extraction_id');
        return await getExtractionStatus(extractionId, env, corsHeaders);
      }

      if (url.pathname === '/continue' && request.method === 'POST') {
        return await continueWorkflow(request, env, corsHeaders);
      }
    
      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },
};

async function handleExtraction(request, env, corsHeaders) {
  const data = await request.json();
  const { extraction_id } = data;

  // Initialiser le workflow
  await initializeWorkflow(extraction_id, data, env);

  // Démarrer la première étape
  await scheduleNextStep(extraction_id, env);

  return new Response(JSON.stringify({
    success: true,
    extraction_id,
    message: 'Extraction workflow started',
    status: 'collecting_places'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function continueWorkflow(request, env, corsHeaders) {
  const { extraction_id } = await request.json();

  const workflow = await getWorkflowState(extraction_id, env);
  if (!workflow) {
    return new Response('Workflow not found', { status: 404, headers: corsHeaders });
  }

  await executeCurrentStep(workflow, env);

  return new Response(JSON.stringify({
    success: true,
    extraction_id,
    message: 'Step executed'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// === WORKFLOW MANAGEMENT ===

async function initializeWorkflow(extractionId, data, env) {
  const workflow = {
    extraction_id: extractionId,
    current_step: 'collecting_places',
    current_page: 1,
    total_pages: MAX_PAGES,
    batch_size: BATCH_SIZE,
    parameters: data,
    places_data: [],
    people_data: [],
    enriched_data: [],
    step_progress: {
      collecting_places: 0,
      searching_people: 0,
      enriching_contacts: 0,
      enriching_linkedin: 0
    },
    created_at: new Date().toISOString()
  };

  await saveWorkflowState(extractionId, workflow, env);
  await updateExtractionStatus(extractionId, 'collecting_places', 5, env);
}

async function executeCurrentStep(workflow, env) {
  const startTime = Date.now();

  try {
    switch (workflow.current_step) {
      case 'collecting_places':
        await executeCollectPlaces(workflow, env, startTime);
        break;
      case 'searching_people':
        await executeSearchPeople(workflow, env, startTime);
        break;
      case 'enriching_contacts':
        await executeEnrichContacts(workflow, env, startTime);
        break;
      case 'enriching_linkedin':
        await executeEnrichLinkedIn(workflow, env, startTime);
        break;
      case 'finalizing':
        await executeFinalizing(workflow, env);
        break;
    }
  } catch (error) {
    console.error(`Error in step ${workflow.current_step}:`, error);
    await updateExtractionStatus(workflow.extraction_id, 'failed', 100, env, error.message);
  }
}

async function executeCollectPlaces(workflow, env, startTime) {
  const { country, company_type, keywords = [] } = workflow.parameters;

  for (let page = workflow.current_page; page <= workflow.total_pages; page++) {
    if (Date.now() - startTime > STEP_TIMEOUT) {
      workflow.current_page = page;
      await saveWorkflowState(workflow.extraction_id, workflow, env);
      await scheduleNextStep(workflow.extraction_id, env);
      return;
    }

    const places = await collectPlacesBatch(country, company_type, keywords, page, env);
    workflow.places_data.push(...places);

    const progress = Math.round((page / workflow.total_pages) * 25);
    await updateExtractionStatus(workflow.extraction_id, 'collecting_places', progress, env);

    if (places.length < BATCH_SIZE) break; // Pas plus de données
  }

  // Étape terminée, passer à la suivante
  workflow.current_step = 'searching_people';
  workflow.current_page = 1;
  workflow.step_progress.collecting_places = workflow.places_data.length;

  await saveWorkflowState(workflow.extraction_id, workflow, env);
  await updateExtractionStatus(workflow.extraction_id, 'searching_people', 25, env);
  await scheduleNextStep(workflow.extraction_id, env);
}

async function executeSearchPeople(workflow, env, startTime) {
  // Vérifier si Apollo est configuré
  if (!env.APOLLO_API_KEY) {
    console.log('Apollo API non configuré, passage à la finalisation avec les enseignes uniquement');
    workflow.current_step = 'finalizing';
    await saveWorkflowState(workflow.extraction_id, workflow, env);
    await updateExtractionStatus(workflow.extraction_id, 'finalizing', 90, env);
    await executeFinalizing(workflow, env);
    return;
  }

  const placesPerBatch = Math.ceil(workflow.places_data.length / workflow.total_pages);

  for (let page = workflow.current_page; page <= workflow.total_pages; page++) {
    if (Date.now() - startTime > STEP_TIMEOUT) {
      workflow.current_page = page;
      await saveWorkflowState(workflow.extraction_id, workflow, env);
      await scheduleNextStep(workflow.extraction_id, env);
      return;
    }

    const startIdx = (page - 1) * placesPerBatch;
    const endIdx = Math.min(startIdx + placesPerBatch, workflow.places_data.length);
    const placeBatch = workflow.places_data.slice(startIdx, endIdx);

    if (placeBatch.length === 0) break;

    try {
      const people = await searchPeopleApollo(placeBatch, env);
      workflow.people_data.push(...people);
    } catch (error) {
      console.error('Erreur Apollo, continuation sans enrichissement:', error);
      // Continuer même en cas d'erreur Apollo
    }

    const progress = 25 + Math.round((page / workflow.total_pages) * 25);
    await updateExtractionStatus(workflow.extraction_id, 'searching_people', progress, env);
  }

  // Si pas de personnes trouvées, passer directement à la finalisation avec les enseignes
  if (workflow.people_data.length === 0) {
    console.log('Aucune personne trouvée via Apollo, finalisation avec les enseignes uniquement');
    workflow.current_step = 'finalizing';
    await saveWorkflowState(workflow.extraction_id, workflow, env);
    await updateExtractionStatus(workflow.extraction_id, 'finalizing', 90, env);
    await executeFinalizing(workflow, env);
    return;
  }

  // Étape terminée
  workflow.current_step = 'enriching_contacts';
  workflow.current_page = 1;
  workflow.step_progress.searching_people = workflow.people_data.length;

  await saveWorkflowState(workflow.extraction_id, workflow, env);
  await updateExtractionStatus(workflow.extraction_id, 'enriching_contacts', 50, env);
  await scheduleNextStep(workflow.extraction_id, env);
}

async function executeEnrichContacts(workflow, env, startTime) {
  // Si pas d'Apollo configuré, passer directement à Kaspr ou finalisation
  if (!env.APOLLO_API_KEY) {
    workflow.current_step = env.KASPR_API_KEY ? 'enriching_linkedin' : 'finalizing';
    await saveWorkflowState(workflow.extraction_id, workflow, env);
    const nextProgress = env.KASPR_API_KEY ? 70 : 90;
    await updateExtractionStatus(workflow.extraction_id, workflow.current_step, nextProgress, env);

    if (workflow.current_step === 'finalizing') {
      await executeFinalizing(workflow, env);
    } else {
      await scheduleNextStep(workflow.extraction_id, env);
    }
    return;
  }

  const peoplePerBatch = Math.ceil(workflow.people_data.length / workflow.total_pages);

  for (let page = workflow.current_page; page <= workflow.total_pages; page++) {
    if (Date.now() - startTime > STEP_TIMEOUT) {
      workflow.current_page = page;
      await saveWorkflowState(workflow.extraction_id, workflow, env);
      await scheduleNextStep(workflow.extraction_id, env);
      return;
    }

    const startIdx = (page - 1) * peoplePerBatch;
    const endIdx = Math.min(startIdx + peoplePerBatch, workflow.people_data.length);
    const peopleBatch = workflow.people_data.slice(startIdx, endIdx);

    if (peopleBatch.length === 0) break;

    try {
      const enriched = await enrichContactsApollo(peopleBatch, env);
      workflow.enriched_data.push(...enriched);
    } catch (error) {
      console.error('Erreur enrichissement Apollo, continuation:', error);
      // Ajouter les personnes sans enrichissement
      workflow.enriched_data.push(...peopleBatch);
    }

    const progress = 50 + Math.round((page / workflow.total_pages) * 20);
    await updateExtractionStatus(workflow.extraction_id, 'enriching_contacts', progress, env);
  }

  // Étape terminée
  workflow.current_step = env.KASPR_API_KEY ? 'enriching_linkedin' : 'finalizing';
  workflow.current_page = 1;
  workflow.step_progress.enriching_contacts = workflow.enriched_data.length;

  await saveWorkflowState(workflow.extraction_id, workflow, env);

  if (workflow.current_step === 'finalizing') {
    await updateExtractionStatus(workflow.extraction_id, 'finalizing', 90, env);
    await executeFinalizing(workflow, env);
  } else {
    await updateExtractionStatus(workflow.extraction_id, 'enriching_linkedin', 70, env);
    await scheduleNextStep(workflow.extraction_id, env);
  }
}

async function executeEnrichLinkedIn(workflow, env, startTime) {
  // Si pas de Kaspr configuré, passer directement à la finalisation
  if (!env.KASPR_API_KEY) {
    console.log('Kaspr API non configuré, finalisation sans enrichissement Kaspr');
    workflow.current_step = 'finalizing';
    await saveWorkflowState(workflow.extraction_id, workflow, env);
    await updateExtractionStatus(workflow.extraction_id, 'finalizing', 90, env);
    await executeFinalizing(workflow, env);
    return;
  }

  const peoplePerBatch = Math.ceil(workflow.enriched_data.length / workflow.total_pages);

  for (let page = workflow.current_page; page <= workflow.total_pages; page++) {
    if (Date.now() - startTime > STEP_TIMEOUT) {
      workflow.current_page = page;
      await saveWorkflowState(workflow.extraction_id, workflow, env);
      await scheduleNextStep(workflow.extraction_id, env);
      return;
    }

    const startIdx = (page - 1) * peoplePerBatch;
    const endIdx = Math.min(startIdx + peoplePerBatch, workflow.enriched_data.length);
    const peopleBatch = workflow.enriched_data.slice(startIdx, endIdx);

    if (peopleBatch.length === 0) break;

    try {
      await enrichContactsKaspr(peopleBatch, env);
    } catch (error) {
      console.error('Erreur enrichissement Kaspr, continuation:', error);
      // Continuer même en cas d'erreur Kaspr
    }

    const progress = 70 + Math.round((page / workflow.total_pages) * 20);
    await updateExtractionStatus(workflow.extraction_id, 'enriching_linkedin', progress, env);
  }

  // Étape terminée
  workflow.current_step = 'finalizing';
  workflow.step_progress.enriching_linkedin = workflow.enriched_data.length;

  await saveWorkflowState(workflow.extraction_id, workflow, env);
  await updateExtractionStatus(workflow.extraction_id, 'finalizing', 90, env);
  await executeFinalizing(workflow, env);
}

async function executeFinalizing(workflow, env) {
  let dataToExport = [];

  // Prioriser les données enrichies, sinon les personnes, sinon les enseignes seules
  if (workflow.enriched_data.length > 0) {
    // Données avec personnes (enrichies ou non)
    dataToExport = workflow.enriched_data;
  } else if (workflow.people_data.length > 0) {
    // Données avec personnes mais sans enrichissement
    dataToExport = workflow.people_data;
  } else {
    // Seulement les enseignes (cas où Apollo/Kaspr ont échoué)
    dataToExport = workflow.places_data.map(place => ({
      company_name: place.name,
      company_website: place.website,
      address: place.address,
      latitude: place.lat,
      longitude: place.lon,
      data_source: 'overpass_api'
    }));
  }

  if (dataToExport.length === 0) {
    await updateExtractionStatus(workflow.extraction_id, 'failed', 100, env, 'Aucune donnée trouvée');
    return;
  }

  // Générer et sauvegarder le fichier
  const fileUrl = await generateAndSaveFile(
    workflow.extraction_id,
    dataToExport,
    workflow.parameters.file_format,
    env
  );

  // Calculer les statistiques
  const totalPeople = dataToExport.filter(item => item.first_name || item.last_name).length;
  const totalContacts = dataToExport.filter(item => item.email || item.phone).length;

  // Finaliser l'extraction
  await updateExtractionStatus(workflow.extraction_id, 'completed', 100, env);
  await updateExtractionData(workflow.extraction_id, {
    file_url: fileUrl,
    total_places_found: workflow.places_data.length,
    total_people_found: totalPeople,
    total_contacts_enriched: totalContacts,
    completed_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 jours
  }, env);

  // Nettoyer le workflow
  await deleteWorkflowState(workflow.extraction_id, env);
}

async function scheduleNextStep(extractionId, env) {
  // Programmer la prochaine exécution via un fetch vers /continue
  // En production, utiliser Cloudflare Durable Objects ou Cron Triggers
  setTimeout(async () => {
    try {
      await fetch(`${env.WORKER_URL}/continue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extraction_id: extractionId })
      });
    } catch (error) {
      console.error('Failed to schedule next step:', error);
    }
  }, 1000);
}

// === API FUNCTIONS ===

async function collectPlacesBatch(country, companyType, keywords, page, env) {
  // Utiliser Overpass API pour des données plus riches
  const countryCode = getCountryCode(country);
  const searchTerms = [companyType, ...keywords].join('|');

  // Requête Overpass pour chercher des commerces/entreprises
  const overpassQuery = `
    [out:json][timeout:25];
    (
      node["shop"~"${searchTerms}",i]["addr:country"="${countryCode}"];
      node["amenity"~"${searchTerms}",i]["addr:country"="${countryCode}"];
      node["office"]["addr:country"="${countryCode}"];
      way["shop"~"${searchTerms}",i]["addr:country"="${countryCode}"];
      way["amenity"~"${searchTerms}",i]["addr:country"="${countryCode}"];
      way["office"]["addr:country"="${countryCode}"];
    );
    out center meta;
  `;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'AshScrap/1.0'
      },
      body: `data=${encodeURIComponent(overpassQuery)}`
    });

    if (!response.ok) {
      // Fallback vers Nominatim si Overpass échoue
      return await collectPlacesNominatim(country, companyType, keywords, page);
    }

    const data = await response.json();
    const places = [];

    for (const element of data.elements || []) {
      const tags = element.tags || {};
      const lat = element.lat || element.center?.lat;
      const lon = element.lon || element.center?.lon;

      if (lat && lon) {
        places.push({
          name: tags.name || tags.brand || tags['addr:housename'] || 'Entreprise sans nom',
          address: buildAddress(tags),
          website: tags.website || tags['contact:website'],
          phone: tags.phone || tags['contact:phone'],
          email: tags.email || tags['contact:email'],
          opening_hours: tags.opening_hours,
          shop_type: tags.shop || tags.amenity || tags.office,
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          osm_id: element.id,
          data_source: 'overpass_api'
        });
      }
    }

    // Pagination simulée (Overpass ne supporte pas l'offset natif)
    const startIdx = (page - 1) * BATCH_SIZE;
    const endIdx = startIdx + BATCH_SIZE;

    return places.slice(startIdx, endIdx);

  } catch (error) {
    console.error('Erreur Overpass API, fallback vers Nominatim:', error);
    return await collectPlacesNominatim(country, companyType, keywords, page);
  }
}

// Fallback vers Nominatim
async function collectPlacesNominatim(country, companyType, keywords, page) {
  const query = [companyType, ...keywords].join(' ');
  const countryCode = getCountryCode(country);
  const offset = (page - 1) * BATCH_SIZE;

  const url = `https://nominatim.openstreetmap.org/search?` + new URLSearchParams({
    q: query,
    countrycodes: countryCode,
    format: 'json',
    limit: BATCH_SIZE.toString(),
    offset: offset.toString(),
    addressdetails: '1',
    extratags: '1'
  });

  const response = await fetch(url, {
    headers: { 'User-Agent': 'AshScrap/1.0' }
  });

  if (!response.ok) {
    throw new Error(`Nominatim API error: ${response.status}`);
  }

  const data = await response.json();

  return data.map(item => ({
    name: item.display_name.split(',')[0],
    address: item.display_name,
    website: item.extratags?.website,
    phone: item.extratags?.phone,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    data_source: 'nominatim'
  }));
}

// Construire une adresse à partir des tags OSM
function buildAddress(tags) {
  const parts = [];

  if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
  if (tags['addr:street']) parts.push(tags['addr:street']);
  if (tags['addr:city']) parts.push(tags['addr:city']);
  if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
  if (tags['addr:country']) parts.push(tags['addr:country']);

  return parts.length > 0 ? parts.join(', ') : 'Adresse non disponible';
}

async function searchPeopleApollo(places, env) {
  const people = [];

  for (const place of places) {
    try {
      const response = await fetch('https://api.apollo.io/v1/people/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': env.APOLLO_API_KEY
        },
        body: JSON.stringify({
          q_organization_name: place.name,
          person_titles: ['CEO', 'CTO', 'Founder', 'Co-Founder', 'President', 'Chief', 'Manager', 'Director'],
          page: 1,
          per_page: 10
        })
      });

      if (response.ok) {
        const apolloData = await response.json();

        for (const person of apolloData.people || []) {
          people.push({
            first_name: person.first_name,
            last_name: person.last_name,
            title: person.title,
            company_name: place.name,
            company_website: place.website,
            apollo_id: person.id,
            linkedin: person.linkedin_url
          });
        }
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      console.error(`Error searching people for ${place.name}:`, error);
    }
  }

  return people;
}

async function enrichContactsApollo(people, env) {
  for (const person of people) {
    if (person.apollo_id) {
      try {
        const response = await fetch('https://api.apollo.io/v1/people/match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': env.APOLLO_API_KEY
          },
          body: JSON.stringify({
            id: person.apollo_id,
            reveal_personal_emails: true,
            reveal_phone_number: true
          })
        });

        if (response.ok) {
          const apolloData = await response.json();
          const enrichedPerson = apolloData.person;

          if (enrichedPerson) {
            person.email = enrichedPerson.email || person.email;
            person.phone = enrichedPerson.sanitized_phone || person.phone;
            person.personal_emails = enrichedPerson.personal_emails || [];
          }
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Apollo enrichment error for ${person.first_name}:`, error);
      }
    }
  }

  return people;
}

async function enrichContactsKaspr(people, env) {
  for (const person of people) {
    if (person.linkedin && (!person.email || !person.phone)) {
      try {
        const response = await fetch('https://api.kaspr.io/api/v1/linkedin/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.KASPR_API_KEY}`
          },
          body: JSON.stringify({
            linkedin_url: person.linkedin
          })
        });

        if (response.ok) {
          const kasprData = await response.json();

          // Kaspr en backup si Apollo n'a pas trouvé
          if (kasprData.email && !person.email) {
            person.email = kasprData.email;
            person.email_source = 'kaspr';
          }
          if (kasprData.phone && !person.phone) {
            person.phone = kasprData.phone;
            person.phone_source = 'kaspr';
          }

          // Informations supplémentaires Kaspr
          if (kasprData.company) {
            person.company_info = kasprData.company;
          }
        }

        // Rate limiting plus strict pour Kaspr
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Kaspr enrichment error for ${person.first_name}:`, error);
      }
    }
  }

  return people;
}

// === WORKFLOW STATE MANAGEMENT ===

async function saveWorkflowState(extractionId, workflow, env) {
  const key = `workflow:${extractionId}`;
  await env.WORKFLOW_KV.put(key, JSON.stringify(workflow), { expirationTtl: 86400 }); // 24h
}

async function getWorkflowState(extractionId, env) {
  const key = `workflow:${extractionId}`;
  const data = await env.WORKFLOW_KV.get(key);
  return data ? JSON.parse(data) : null;
}

async function deleteWorkflowState(extractionId, env) {
  const key = `workflow:${extractionId}`;
  await env.WORKFLOW_KV.delete(key);
}

// === SUPABASE FUNCTIONS ===

async function updateExtractionStatus(extractionId, status, progress, env, errorMessage) {
  const updateData = {
    status,
    progress_percentage: progress
  };

  if (errorMessage) {
    updateData.error_message = errorMessage;
  }

  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  await fetch(`${env.SUPABASE_URL}/rest/v1/extractions?id=eq.${extractionId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY
    },
    body: JSON.stringify(updateData)
  });
}

async function updateExtractionData(extractionId, data, env) {
  await fetch(`${env.SUPABASE_URL}/rest/v1/extractions?id=eq.${extractionId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY
    },
    body: JSON.stringify(data)
  });
}

async function generateAndSaveFile(extractionId, data, format, env) {
  // Headers adaptés selon le type de données
  const hasPersonData = data.some(item => item.first_name || item.last_name);

  let headers;
  if (hasPersonData) {
    // Données avec personnes - format simplifié
    headers = ['Prénom', 'Nom', 'Titre', 'Entreprise', 'Email', 'Téléphone', 'LinkedIn'];
  } else {
    // Seulement les enseignes - format simplifié
    headers = ['Nom Entreprise', 'Adresse', 'Téléphone', 'Site Web'];
  }

  let fileContent;
  let contentType;
  let fileExtension;

  if (format === 'csv') {
    if (hasPersonData) {
      fileContent = [
        headers.join(','),
        ...data.map(person => [
          person.first_name || '',
          person.last_name || '',
          person.title || '',
          person.company_name || '',
          person.email || '',
          person.phone || '',
          person.linkedin || ''
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
    } else {
      fileContent = [
        headers.join(','),
        ...data.map(place => [
          place.company_name || place.name || '',
          place.address || '',
          place.phone || '',
          place.company_website || place.website || ''
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
    }
    contentType = 'text/csv';
    fileExtension = 'csv';
  } else {
    // Format Excel (TSV pour compatibilité)
    if (hasPersonData) {
      fileContent = [
        headers.join('\t'),
        ...data.map(person => [
          person.first_name || '',
          person.last_name || '',
          person.title || '',
          person.company_name || '',
          person.email || '',
          person.phone || '',
          person.linkedin || ''
        ].join('\t'))
      ].join('\n');
    } else {
      fileContent = [
        headers.join('\t'),
        ...data.map(place => [
          place.company_name || place.name || '',
          place.address || '',
          place.phone || '',
          place.company_website || place.website || ''
        ].join('\t'))
      ].join('\n');
    }
    contentType = 'application/vnd.ms-excel';
    fileExtension = 'xlsx';
  }

  // Vérifier la taille du fichier (100 Mo = 104857600 bytes)
  const fileSizeBytes = new TextEncoder().encode(fileContent).length;
  const maxSizeBytes = 100 * 1024 * 1024; // 100 Mo

  if (fileSizeBytes > maxSizeBytes) {
    throw new Error('Extraction trop lourde, veuillez revoir vos paramètres');
  }

  // Upload vers Supabase Storage
  const fileName = `${extractionId}.${fileExtension}`;
  const uploadResponse = await fetch(`${env.SUPABASE_URL}/storage/v1/object/extractions/${fileName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': contentType,
      'x-upsert': 'true'
    },
    body: fileContent
  });

  if (uploadResponse.ok) {
    // Générer URL signée avec expiration 7 jours
    const signedUrlResponse = await fetch(`${env.SUPABASE_URL}/storage/v1/object/sign/extractions/${fileName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ expiresIn: 604800 }) // 7 jours en secondes
    });

    if (signedUrlResponse.ok) {
      const signedData = await signedUrlResponse.json();
      return `${env.SUPABASE_URL}/storage/v1${signedData.signedURL}`;
    }
  }

  throw new Error('Erreur upload fichier');
}

async function getExtractionStatus(extractionId, env, corsHeaders) {
  if (!extractionId) {
    return new Response('Missing extraction_id', { status: 400, headers: corsHeaders });
  }

  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/extractions?id=eq.${extractionId}&select=*`, {
    headers: {
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY
    }
  });

  if (!response.ok) {
    return new Response('Extraction not found', { status: 404, headers: corsHeaders });
  }

  const data = await response.json();

  return new Response(JSON.stringify(data[0] || null), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// === UTILITAIRES ===

function getCountryCode(country) {
  const codes = {
    'France': 'fr',
    'Belgique': 'be',
    'Suisse': 'ch',
    'Canada': 'ca',
    'Allemagne': 'de',
    'Espagne': 'es',
    'Italie': 'it'
  };

  return codes[country] || 'fr';
}