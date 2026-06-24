# Mobile App Migration Task (React Native + Expo)

You are a Senior Full Stack Engineer and Mobile Architect.

Your task is to convert the existing web application into a production-ready mobile application using React Native and Expo, while preserving all existing business logic, features, workflows, APIs, database structure, permissions, and user experience.

## Objective

Build a native mobile application for both iOS and Android that mirrors the functionality of the existing web application.

The mobile app must:

* Support App Store and Google Play Store deployment.
* Maintain full compatibility with the existing backend.
* Reuse the current APIs and database without modification.
* Preserve all existing business logic.
* Preserve all user roles and permissions.
* Maintain feature parity with the web platform.
* Follow the existing UI/UX design system and branding.
* Be production-ready.

## Project Discovery Phase

Before implementing anything:

1. Read and analyze the entire `README.md`.
2. Analyze the complete web application architecture.
3. Understand:

   * Authentication flow
   * User roles
   * API integrations
   * Database schema
   * State management
   * File uploads
   * Notifications
   * Payment systems
   * Real-time functionality
   * Analytics
   * Admin features
4. Generate a migration plan before coding.
5. Identify every web feature that must exist in mobile.

Do not skip any feature.

## Technical Requirements

### Framework

* React Native
* Expo SDK (latest stable)
* TypeScript

### Navigation

Use Expo Router.

### State Management

Maintain the same state architecture as the web app whenever possible.

### API Layer

Reuse the existing API architecture.

Do NOT:

* Change endpoints
* Change request structures
* Change response structures
* Create duplicate backend services

The mobile app must communicate with the existing backend exactly as the web application does.

### Database

The database is the source of truth.

Do NOT:

* Modify tables
* Modify schemas
* Modify relationships
* Create alternative storage systems

The mobile app must use the existing database architecture without changes.

## Feature Parity Requirements

Every feature that exists in the web application must exist in mobile.

Examples:

* Authentication
* Registration
* Password reset
* Profile management
* Dashboard
* CRUD operations
* Search
* Filtering
* Sorting
* Favorites
* Messaging
* Notifications
* Payments
* Subscription management
* File uploads
* Media viewing
* Reports
* Analytics
* Admin functions
* Settings
* Role-based permissions

No feature should be omitted unless technically impossible on mobile.

## UI/UX Requirements

The mobile application must follow the existing design system.

Requirements:

* Match branding
* Match colors
* Match typography
* Match spacing
* Match icons
* Match component hierarchy

However:

* Optimize layouts for mobile devices.
* Improve touch interactions.
* Follow iOS and Android platform conventions.
* Maintain consistency with the web version.

Do not redesign the product.

The goal is feature parity, not a redesign.

## Mobile-Specific Enhancements

Where appropriate, implement:

* Push notifications
* Deep linking
* Secure storage
* Biometric authentication
* Camera integration
* Image picker
* Native share sheet
* Offline handling
* Network state monitoring

Only if they enhance the existing functionality.

## App Store & Play Store Compliance

The application must be compliant with:

### Apple App Store

* Sign In With Apple (if applicable)
* Account deletion support
* Privacy requirements
* Permission disclosures
* In-app purchase compliance where required

### Google Play

* Data Safety requirements
* Permission declarations
* Privacy policy compliance
* Target SDK compliance

## Code Quality Requirements

Produce production-grade code.

Requirements:

* TypeScript strict mode
* Modular architecture
* Reusable components
* Error boundaries
* Loading states
* Empty states
* Skeleton loaders
* Proper validation
* Secure API handling
* Environment configuration
* Logging strategy
* Monitoring integration
* Performance optimization

## Security Requirements

Implement and verify:

* Authentication protection
* Authorization validation
* Secure token storage
* API request validation
* Input sanitization
* XSS prevention
* CSRF mitigation where applicable
* Rate limiting awareness
* Secure file upload handling
* Sensitive data protection

Do not weaken existing security controls.

## Deliverables

1. Complete React Native Expo application.
2. Feature parity report.
3. Screen inventory.
4. Navigation map.
5. Mobile architecture documentation.
6. Build instructions.
7. Environment setup guide.
8. App Store deployment guide.
9. Google Play deployment guide.
10. Testing checklist.

## Execution Rules

* Analyze first.
* Plan before coding.
* Create tasks incrementally.
* Verify every feature against the web application.
* Do not remove existing functionality.
* Do not change backend behavior.
* Do not change database behavior.
* Do not introduce breaking changes.

Success criteria:

A user should be able to use the mobile app and perform every action available in the web application with the same data, permissions, workflows, and outcomes.
