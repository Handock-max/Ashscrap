#!/usr/bin/env node

/**
 * Script de configuration automatique pour Supabase
 * Usage: node scripts/setup-supabase.js
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`)
}

function execCommand(command, description) {
    log(`\n${description}...`, 'blue')
    try {
        const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' })
        log(`✓ ${description} terminé`, 'green')
        return output
    } catch (error) {
        log(`✗ Erreur: ${error.message}`, 'red')
        throw error
    }
}

function checkSupabaseCLI() {
    try {
        execSync('supabase --version', { stdio: 'pipe' })
        log('✓ Supabase CLI détecté', 'green')
        return true
    } catch {
        log('✗ Supabase CLI non installé', 'red')
        log('Installez-le avec: npm install -g supabase', 'yellow')
        return false
    }
}

function createEnvFile() {
    const envPath = '.env.local'

    if (existsSync(envPath)) {
        log('⚠️  Le fichier .env.local existe déjà', 'yellow')
        return
    }

    log('\n📝 Configuration des variables d\'environnement', 'cyan')

    const projectUrl = process.env.SUPABASE_URL || 'https://your-project-ref.supabase.co'
    const anonKey = process.env.SUPABASE_ANON_KEY || 'your_supabase_anon_key_here'

    const envContent = `# Supabase Configuration
VITE_SUPABASE_URL=${projectUrl}
VITE_SUPABASE_ANON_KEY=${anonKey}

# Development
NODE_ENV=development

# Feature flags
VITE_ENABLE_REALTIME_NOTIFICATIONS=true
VITE_ENABLE_AUDIT_LOGS=true
VITE_MAX_EXTRACTIONS_PER_HOUR=10
`

    writeFileSync(envPath, envContent)
    log('✓ Fichier .env.local créé', 'green')
    log('⚠️  N\'oubliez pas de mettre à jour les valeurs Supabase!', 'yellow')
}

function setupSupabaseProject() {
    log('\n🚀 Configuration du projet Supabase', 'cyan')

    // Vérifier si le projet est déjà lié
    try {
        const config = readFileSync('.supabase/config.toml', 'utf8')
        if (config.includes('project_id')) {
            log('✓ Projet Supabase déjà configuré', 'green')
            return
        }
    } catch {
        // Fichier de config n'existe pas, continuer
    }

    log('Pour lier votre projet Supabase:', 'yellow')
    log('1. supabase login', 'yellow')
    log('2. supabase link --project-ref YOUR_PROJECT_REF', 'yellow')
    log('3. supabase db push', 'yellow')
}

function generateTypes() {
    try {
        execCommand(
            'supabase gen types typescript --local > src/integrations/supabase/types.ts',
            'Génération des types TypeScript'
        )
    } catch {
        log('⚠️  Impossible de générer les types. Assurez-vous que Supabase est configuré.', 'yellow')
    }
}

function checkDependencies() {
    log('\n📦 Vérification des dépendances', 'cyan')

    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
    const requiredDeps = ['@supabase/supabase-js']

    const missing = requiredDeps.filter(dep =>
        !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
    )

    if (missing.length > 0) {
        log(`✗ Dépendances manquantes: ${missing.join(', ')}`, 'red')
        log('Installez-les avec: npm install @supabase/supabase-js', 'yellow')
    } else {
        log('✓ Toutes les dépendances sont présentes', 'green')
    }
}

function main() {
    log('🔧 Configuration automatique de Supabase pour WorkFlow Hub', 'bright')
    log('='.repeat(60), 'cyan')

    try {
        // Vérifications préliminaires
        checkDependencies()

        // Configuration des fichiers
        createEnvFile()

        // Vérification de Supabase CLI
        if (checkSupabaseCLI()) {
            setupSupabaseProject()
            // generateTypes() // Commenté car nécessite une connexion active
        }

        log('\n🎉 Configuration terminée!', 'green')
        log('\nProchaines étapes:', 'cyan')
        log('1. Créez un projet sur supabase.com', 'yellow')
        log('2. Mettez à jour .env.local avec vos vraies valeurs', 'yellow')
        log('3. Exécutez: supabase login && supabase link', 'yellow')
        log('4. Appliquez les migrations: supabase db push', 'yellow')
        log('5. Générez les types: npm run generate-types', 'yellow')

    } catch (error) {
        log(`\n💥 Erreur lors de la configuration: ${error.message}`, 'red')
        process.exit(1)
    }
}

// Ajouter le script au package.json
function addScripts() {
    const packagePath = 'package.json'
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))

    const newScripts = {
        'setup:supabase': 'node scripts/setup-supabase.js',
        'generate-types': 'supabase gen types typescript --local > src/integrations/supabase/types.ts',
        'db:reset': 'supabase db reset',
        'db:push': 'supabase db push',
        'functions:deploy': 'supabase functions deploy',
    }

    packageJson.scripts = { ...packageJson.scripts, ...newScripts }

    writeFileSync(packagePath, JSON.stringify(packageJson, null, 2))
    log('✓ Scripts ajoutés au package.json', 'green')
}

if (import.meta.url === `file://${process.argv[1]}`) {
    addScripts()
    main()
}