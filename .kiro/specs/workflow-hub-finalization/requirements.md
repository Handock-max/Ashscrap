# Requirements Document

## Introduction

Cette spécification couvre la finalisation et l'amélioration de l'application WorkFlow Hub - une plateforme d'extraction de données professionnelle avec workflows automatisés. L'objectif est de compléter les fonctionnalités manquantes, améliorer l'expérience utilisateur, supprimer toute référence à Lovable, et préparer l'application pour un déploiement en production.

## Requirements

### Requirement 1

**User Story:** En tant que développeur, je veux supprimer toutes les références à Lovable du code pour avoir une application indépendante et éviter les surprises futures.

#### Acceptance Criteria

1. WHEN scanning the codebase THEN the system SHALL identify and remove all Lovable-related imports, comments, and references
2. WHEN reviewing package.json THEN the system SHALL remove any Lovable-specific dependencies
3. WHEN checking component files THEN the system SHALL replace any Lovable-specific patterns with standard React/TypeScript patterns
4. WHEN building the application THEN the system SHALL compile without any Lovable dependencies

### Requirement 2

**User Story:** En tant qu'utilisateur, je veux une barre de navigation verticale rétractable à gauche pour une meilleure utilisation de l'espace écran.

#### Acceptance Criteria

1. WHEN accessing the application THEN the system SHALL display a collapsible sidebar on the left side
2. WHEN clicking outside the sidebar THEN the system SHALL automatically collapse the sidebar
3. WHEN clicking the collapse/expand button THEN the system SHALL toggle the sidebar state
4. WHEN the sidebar is collapsed THEN the system SHALL show only icons with tooltips
5. WHEN the sidebar is expanded THEN the system SHALL show full navigation labels
6. WHEN on mobile devices THEN the system SHALL overlay the sidebar instead of pushing content

### Requirement 3

**User Story:** En tant qu'administrateur système, je veux un script SQL complet pour initialiser la base de données Supabase avec toutes les tables et données nécessaires.

#### Acceptance Criteria

1. WHEN running the SQL script THEN the system SHALL create all required tables (users, extractions, settings, etc.)
2. WHEN creating tables THEN the system SHALL include proper foreign key relationships
3. WHEN setting up authentication THEN the system SHALL configure RLS (Row Level Security) policies
4. WHEN initializing data THEN the system SHALL create default admin user and settings
5. WHEN applying migrations THEN the system SHALL be compatible with existing Supabase migration structure

### Requirement 4

**User Story:** En tant que développeur, je veux préparer l'application pour l'hébergement GitHub avec une documentation complète et des configurations appropriées.

#### Acceptance Criteria

1. WHEN preparing for GitHub THEN the system SHALL include a comprehensive README.md
2. WHEN setting up the repository THEN the system SHALL include proper .gitignore and environment configuration
3. WHEN documenting the project THEN the system SHALL provide clear installation and deployment instructions
4. WHEN configuring for production THEN the system SHALL include environment variables documentation
5. WHEN setting up CI/CD THEN the system SHALL include GitHub Actions workflows for deployment

### Requirement 5

**User Story:** En tant qu'utilisateur, je veux que toutes les fonctionnalités d'extraction de données soient complètement implémentées et fonctionnelles.

#### Acceptance Criteria

1. WHEN configuring extraction parameters THEN the system SHALL provide all dropdown options (pays, secteurs, ancienneté)
2. WHEN launching an extraction THEN the system SHALL call the n8n webhook with proper parameters
3. WHEN extraction is processing THEN the system SHALL display real-time status updates
4. WHEN extraction is complete THEN the system SHALL enable the download button
5. WHEN downloading files THEN the system SHALL provide the generated CSV/Excel file
6. WHEN viewing history THEN the system SHALL display the 10 most recent extractions with proper status

### Requirement 6

**User Story:** En tant qu'administrateur, je veux des fonctionnalités d'administration complètes pour gérer les utilisateurs et personnaliser l'application.

#### Acceptance Criteria

1. WHEN accessing admin panel THEN the system SHALL verify admin role permissions
2. WHEN managing users THEN the system SHALL allow adding, editing, and deleting users
3. WHEN resetting passwords THEN the system SHALL send secure reset links via Supabase Auth
4. WHEN customizing branding THEN the system SHALL allow logo upload and color scheme changes
5. WHEN updating settings THEN the system SHALL persist changes in the database
6. WHEN applying branding THEN the system SHALL reflect changes across the entire application

### Requirement 7

**User Story:** En tant qu'utilisateur, je veux une expérience utilisateur améliorée avec des animations fluides et une interface responsive.

#### Acceptance Criteria

1. WHEN interacting with UI elements THEN the system SHALL provide smooth animations and transitions
2. WHEN using on different screen sizes THEN the system SHALL adapt layout responsively
3. WHEN loading data THEN the system SHALL show appropriate loading states
4. WHEN errors occur THEN the system SHALL display user-friendly error messages
5. WHEN actions complete THEN the system SHALL show success notifications via toast messages

### Requirement 8

**User Story:** En tant que développeur, je veux un code propre et maintenable avec une architecture claire et des bonnes pratiques.

#### Acceptance Criteria

1. WHEN reviewing code structure THEN the system SHALL follow consistent file organization
2. WHEN implementing components THEN the system SHALL use TypeScript with proper type definitions
3. WHEN managing state THEN the system SHALL use appropriate state management patterns
4. WHEN handling errors THEN the system SHALL implement proper error boundaries and handling
5. WHEN writing code THEN the system SHALL follow ESLint rules and formatting standards