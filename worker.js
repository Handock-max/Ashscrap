/**
 * Cloudflare Worker - Ash Scrap Extraction
 * APIs: OpenStreetMap → Apollo → Kaspr → Supabase
 */

export default {
  async fetch(request, env) {
    // CORS headers
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
  const { extraction_id, country, company_type, keywords = [] } = data;
  
  // Démarrer l'extraction en arrière-plan
  await updateExtractionStatus(extraction_id, 'processing', 10, env);
  
  // Lancer le traitement asynchrone
  performExtraction(data, env);
  
  return new Response(JSON.stringify({
    success: true,
    extraction_id,
    message: 'Extraction started',
    status: 'processing'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function performExtraction(data, env) {
  const { extraction_id, country, company_type, keywords = [] } = data;
  
  try {
    // Étape 1: Collecter les lieux via OpenStreetMap
    await updateExtractionStatus(extraction_id, 'processing', 20, env);
    const places = await collectPlaces(country, company_type, keywords);
    
    if (places.length === 0) {
      await updateExtractionStatus(extraction_id, 'failed', 100, env, 'Aucun lieu trouvé');
      return;
    }

    // Étape 2: Rechercher les personnes via Apollo
    await updateExtractionStatus(extraction_id, 'processing', 50, env);
    const people = await searchPeopleApollo(places, env);
    
    if (people.length === 0) {
      await updateExtractionStatus(extraction_id, 'failed', 100, env, 'Aucune personne trouvée');
      return;
    }

    // Étape 3: Enrichir via Kaspr
    await updateExtractionStatus(extraction_id, 'processing', 80, env);
    const enrichedPeople = await enrichContactsKaspr(people, env);
    
    // Filtrer: garder seulement les entreprises avec contacts
    const validPeople = enrichedPeople.filter(person => 
      person.email || person.phone || person.linkedin
    );

    if (validPeople.length === 0) {
      await updateExtractionStatus(extraction_id, 'failed', 100, env, 'Aucun contact valide trouvé');
      return;
    }

    // Étape 4: Générer le fichier et sauvegarder
    const fileUrl = await generateAndSaveFile(extraction_id, validPeople, data.file_format, env);
    
    // Finaliser
    await updateExtractionStatus(extraction_id, 'completed', 100, env);
    await updateExtractionData(extraction_id, {
      file_url: fileUrl,
      total_places_found: places.length,
      total_people_found: validPeople.length,
      completed_at: new Date().toISOString()
    }, env);

  } catch (error) {
    console.error('Extraction error:', error);
    await updateExtractionStatus(extraction_id, 'failed', 100, env, error.message);
  }
}

// === FONCTIONS API ===

async function collectPlaces(country, companyType, keywords) {
  const query = [companyType, ...keywords].join(' ');
  const countryCode = getCountryCode(country);
  
  const url = `https://nominatim.openstreetmap.org/search?` + new URLSearchParams({
    q: query,
    countrycodes: countryCode,
    format: 'json',
    limit: '1000',
    addressdetails: '1',
    extratags: '1'
  });

  const response = await fetch(url, {
    headers: { 'User-Agent': 'AshScrap/1.0' }
  });

  if (!response.ok) {
    throw new Error(`OpenStreetMap API error: ${response.status}`);
  }

  const data = await response.json();
  
  return data.map(item => ({
    name: item.display_name.split(',')[0],
    address: item.display_name,
    website: item.extratags?.website,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon)
  }));
}

async function searchPeopleApollo(places, env) {
  const people = [];
  
  for (const place of places.slice(0, 100)) { // Limiter pour éviter les timeouts
    try {
      const response = await fetch('https://api.apollo.io/v1/people/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': env.APOLLO_API_KEY
        },
        body: JSON.stringify({
          q_organization_name: place.name,
          person_titles: ['CEO', 'CTO', 'Founder', 'Co-Founder', 'President', 'Chief'],
          page: 1,
          per_page: 5
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
            email: person.email,
            phone: person.phone,
            linkedin: person.linkedin_url
          });
        }
      }
      
      // Pause pour respecter les rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error searching people for ${place.name}:`, error);
    }
  }
  
  return people;
}

async function enrichContactsKaspr(people, env) {
  for (const person of people) {
    if (person.linkedin) {
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
          if (kasprData.email && !person.email) {
            person.email = kasprData.email;
          }
          if (kasprData.phone && !person.phone) {
            person.phone = kasprData.phone;
          }
        }
        
        // Pause pour respecter les rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Kaspr enrichment error for ${person.first_name}:`, error);
      }
    }
  }
  
  return people;
}

// === FONCTIONS SUPABASE ===

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

async function generateAndSaveFile(extractionId, people, format, env) {
  // Générer CSV
  const headers = ['Prénom', 'Nom', 'Titre', 'Entreprise', 'Email', 'Téléphone', 'LinkedIn'];
  const csvContent = [
    headers.join(','),
    ...people.map(person => [
      person.first_name || '',
      person.last_name || '',
      person.title || '',
      person.company_name || '',
      person.email || '',
      person.phone || '',
      person.linkedin || ''
    ].map(field => `"${field}"`).join(','))
  ].join('\n');

  // Uploader vers Supabase Storage
  const fileName = `${extractionId}.${format}`;
  const uploadResponse = await fetch(`${env.SUPABASE_URL}/storage/v1/object/extractions/${fileName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'text/csv'
    },
    body: csvContent
  });

  if (uploadResponse.ok) {
    return `${env.SUPABASE_URL}/storage/v1/object/public/extractions/${fileName}`;
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