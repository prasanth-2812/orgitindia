# Database Schema Files

This directory contains unified database schema scripts for the ORGIT backend.

## Files

### Production Schema
- **`schema-production.sql`** - Complete production database schema
  - All tables, indexes, constraints, triggers, and functions
  - No test data
  - Strict constraints and validations
  - Use for: Production deployments, staging environments
  - **This is the main schema file - use this for new database setups**

### Development Schema
- **`schema-development.sql`** - Development database schema
  - Extends production schema with test data
  - Helper functions for development (`clear_test_data()`, `reset_database()`)
  - Use for: Local development, testing environments
  - **Run after schema-production.sql**

### Migration & Fix Scripts
- **`migrate-to-message-backend-schema.sql`** - Migration script for existing databases
  - Updates existing database to match new schema
  - Use for: Migrating existing databases to new schema
- **`fix-conversation-trigger.sql`** - Fixes conversation trigger function
  - Updates `ensure_conversation_members()` function
  - Use for: Fixing duplicate conversation issues
- **`fix-messages-check-constraint.sql`** - Fixes messages check constraint
  - Updates constraint to support conversation_id
  - Use for: Fixing constraint violations on messages table

### Other Files
- **`db.js`** - Database connection configuration
- **`README.md`** - This documentation file

## Usage

### Production Setup

```bash
# Create database
createdb orgit_production

# Run production schema
psql -U postgres -d orgit_production -f database/schema-production.sql
```

### Development Setup

```bash
# Create database
createdb orgit_development

# Run development schema (includes test data)
psql -U postgres -d orgit_development -f database/schema-development.sql
```

### Migration from Existing Database

If you have an existing database, use the migration script:

```bash
psql -U postgres -d orgit_production -f database/migrate-to-message-backend-schema.sql
```

## Schema Overview

### Core Tables
- `organizations` - Organization information
- `users` - User accounts
- `profiles` - Extended user profile data
- `user_organizations` - Many-to-many relationship between users and organizations
- `sessions` - User sessions and authentication tokens
- `otp_verifications` - OTP verification records

### Messaging Module
- `conversations` - Conversation metadata (UUID-based)
- `conversation_members` - Members of conversations
- `messages` - Message content
- `message_status` - Message delivery/read status
- `message_reactions` - Message reactions
- `starred_messages` - Starred messages
- `message_search` - Full-text search index for messages
- `groups` - Legacy group support
- `group_members` - Legacy group members

### Tasks Module
- `compliance_master` - Compliance requirements
- `tasks` - Task definitions
- `task_assignees` - Task assignments
- `task_assignments` - Legacy task assignments
- `task_activities` - Task activity logs
- `task_status_logs` - Legacy task status logs

### Documents Module
- `document_templates` - Document templates
- `document_template_versions` - Template version history
- `document_instances` - Generated document instances
- `documents` - Document files
- `compliance_documents` - Compliance-related documents

### Other Tables
- `contacts` - User contacts
- `user_contacts` - Synced contacts
- `notifications` - User notifications
- `platform_settings` - Platform configuration

## Key Features

### UUID Support
- All primary keys use UUID
- Uses `gen_random_uuid()` for UUID generation
- Requires `uuid-ossp` extension

### Full-Text Search
- Message search uses PostgreSQL's full-text search
- Requires `pg_trgm` extension
- GIN index on `content_tsvector` for fast searches

### Triggers
- `messages_search_trigger` - Auto-updates message_search table
- `messages_conversation_trigger` - Auto-creates conversation_members

### Constraints
- Check constraints on status fields
- Foreign key constraints with CASCADE deletes
- Unique constraints on critical fields

## Development Helpers

The development schema includes helper functions:

```sql
-- Clear only test data
SELECT clear_test_data();

-- Reset entire database (WARNING: Deletes all data!)
SELECT reset_database();
```

## Notes

1. **Conversation IDs**: The schema supports both UUID format and legacy `direct_<userId>` format for backward compatibility.

2. **Legacy Support**: Some tables (groups, group_members, task_assignments) are kept for backward compatibility but new code should use conversations and task_assignees.

3. **Profile Data**: User profile data is split between `users` table (core data) and `profiles` table (extended data).

4. **Message Search**: Full-text search is automatically maintained via triggers. The `message_search` table is updated whenever messages are inserted or updated.

5. **Task Types**: Tasks support both `one_time` and `recurring` types. Recurring tasks use `parent_task_id` to link instances.

## Troubleshooting

### Extension Errors
If you get errors about missing extensions:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### Constraint Violations
If you get constraint violations, check:
- Foreign key references exist
- Check constraints match allowed values
- NOT NULL constraints are satisfied

### Trigger Errors
If triggers fail:
- Check that referenced tables exist
- Verify function definitions are correct
- Check for circular dependencies

## Version History

- **v1.0** - Initial unified schema
  - Combined all schema files into production and development versions
  - Added comprehensive indexes and constraints
  - Included all messaging, tasks, and document management tables

