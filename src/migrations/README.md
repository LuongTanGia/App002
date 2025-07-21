# 📋 Database Migrations Guide

## 🎯 Tổng Quan

Database Migration System cho phép bạn quản lý các thay đổi schema và data transformation một cách có tổ chức, safe và reversible. System này được thiết kế để:

- ✅ **Version control** cho database schema
- ✅ **Track changes** và synchronization giữa environments
- ✅ **Rollback capability** khi có issues
- ✅ **Team collaboration** với consistent database state
- ✅ **Production safety** với validation và transaction support

## 🏗️ Architecture

```
src/migrations/
├── 📁 scripts/                    # Migration files
│   ├── 20250721000001_initial_schema_setup.ts
│   ├── 20250721000002_add_product_analytics_fields.ts
│   └── 20250721000003_add_customer_analytics_and_segmentation.ts
├── 🔧 migrationManager.ts         # Core migration engine
├── 🎛️ migrationService.ts         # Application integration service
├── 📋 migration.model.ts          # Migration tracking schema
├── ⚙️ cli.ts                      # Command line interface
├── 📝 types.ts                    # TypeScript interfaces
└── 🏠 index.ts                    # Module exports
```

## 🚀 Quick Start

### 1. Setup Environment

Đảm bảo có environment variable:

```bash
MONGO_URI=mongodb://localhost:27017/your-database
AUTO_MIGRATE=true  # Optional: Auto-run in development
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Check Migration Status

```bash
npm run migrate:status
```

### 4. Run Migrations

```bash
# Run all pending migrations
npm run migrate

# Dry run (see what will be executed)
npm run migrate:dry
```

## 🎯 Migration Commands

### Basic Commands

```bash
# 📋 View migration status
npm run migrate:status

# 🚀 Run all pending migrations
npm run migrate

# 🔍 Dry run (preview what will be executed)
npm run migrate:dry

# ✅ Validate all migration files
npm run migrate:validate
```

### Advanced Commands

```bash
# 📝 Create new migration
npm run migrate:create "Add user preferences"

# ⏪ Rollback specific migration
npm run migrate:down "Add Product Analytics Fields"

# 🔄 Reset all migrations (WARNING: Destructive!)
npm run migrate:reset --yes
```

### Direct CLI Usage

```bash
# Using ts-node directly for more control
npx ts-node src/migrations/cli.ts status
npx ts-node src/migrations/cli.ts up --dry-run
npx ts-node src/migrations/cli.ts create "Migration Name" --description "Detailed description"
```

## 📝 Writing Migrations

### Migration Template

```typescript
import mongoose from "mongoose";
import { IMigration } from "../types";

const migration: IMigration = {
  name: "Add User Preferences",
  version: "20250721120000",
  description: "Add user preferences and settings fields",

  async up(): Promise<void> {
    try {
      console.log("Running migration: Add User Preferences");

      // Add new fields to users collection
      await mongoose.connection.collection("users").updateMany(
        {},
        {
          $set: {
            preferences: {
              theme: "light",
              language: "vi",
              notifications: true,
              currency: "VND",
            },
            settings: {
              autoSave: true,
              confirmActions: true,
              showTooltips: true,
            },
            lastPreferencesUpdate: new Date(),
          },
        }
      );

      // Create index for preferences queries
      await mongoose.connection
        .collection("users")
        .createIndex(
          { "preferences.language": 1 },
          { name: "users_preferences_language_index" }
        );

      console.log("Migration completed successfully");
    } catch (error: any) {
      console.error("Migration failed:", error.message);
      throw error;
    }
  },

  async down(): Promise<void> {
    try {
      console.log("Rolling back migration: Add User Preferences");

      // Remove the added fields
      await mongoose.connection.collection("users").updateMany(
        {},
        {
          $unset: {
            preferences: 1,
            settings: 1,
            lastPreferencesUpdate: 1,
          },
        }
      );

      // Drop the created index
      await mongoose.connection
        .collection("users")
        .dropIndex("users_preferences_language_index");

      console.log("Rollback completed successfully");
    } catch (error: any) {
      console.error("Rollback failed:", error.message);
      throw error;
    }
  },
};

export default migration;
```

### Migration Best Practices

#### ✅ DO's

1. **Always test both up() and down() methods**

```typescript
// Test rollback capability
await migration.up();
await migration.down(); // Should restore original state
```

2. **Use transactions for multiple operations**

```typescript
const session = await mongoose.startSession();
session.startTransaction();
try {
  await collection1.updateMany({}, {}, { session });
  await collection2.updateMany({}, {}, { session });
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  await session.endSession();
}
```

3. **Add proper error handling**

```typescript
try {
  await dangerousOperation();
} catch (error: any) {
  console.error(`Operation failed: ${error.message}`);
  throw new Error(`Migration failed: ${error.message}`);
}
```

4. **Use descriptive names and comments**

```typescript
// ✅ Good
name: 'Add Product Analytics Fields',
version: '20250721000002',
description: 'Add analytics tracking fields to products for better inventory management',

// ❌ Bad
name: 'Update Products',
version: '1',
description: 'Some changes',
```

5. **Handle missing data gracefully**

```typescript
// Check if field exists before updating
await collection.updateMany(
  { price: { $exists: true } }, // Only update documents with price field
  { $set: { priceHistory: [] } }
);
```

#### ❌ DON'Ts

1. **Don't modify existing data without backup strategy**
2. **Don't use hardcoded values - use environment variables**
3. **Don't ignore errors in rollback methods**
4. **Don't create migrations that can't be rolled back**
5. **Don't run destructive operations without proper validation**

## 📊 Migration Examples

### 1. Adding New Fields

```typescript
async up(): Promise<void> {
  // Add new fields with default values
  await mongoose.connection.collection('products').updateMany(
    {},
    {
      $set: {
        isActive: true,
        createdBy: 'system',
        tags: []
      }
    }
  );
}

async down(): Promise<void> {
  // Remove added fields
  await mongoose.connection.collection('products').updateMany(
    {},
    {
      $unset: {
        isActive: 1,
        createdBy: 1,
        tags: 1
      }
    }
  );
}
```

### 2. Creating Indexes

```typescript
async up(): Promise<void> {
  // Create compound index
  await mongoose.connection.collection('orders').createIndex(
    { customerId: 1, createdAt: -1 },
    {
      name: 'orders_customer_date_index',
      background: true // Non-blocking index creation
    }
  );
}

async down(): Promise<void> {
  await mongoose.connection.collection('orders').dropIndex(
    'orders_customer_date_index'
  );
}
```

### 3. Data Transformation

```typescript
async up(): Promise<void> {
  // Transform existing data
  const products = await mongoose.connection.collection('products').find({}).toArray();

  for (const product of products) {
    const profitMargin = ((product.price - product.cost) / product.price) * 100;

    await mongoose.connection.collection('products').updateOne(
      { _id: product._id },
      {
        $set: {
          profitMargin: Math.round(profitMargin * 100) / 100,
          updatedAt: new Date()
        }
      }
    );
  }
}
```

### 4. Collection Operations

```typescript
async up(): Promise<void> {
  // Create new collection with schema
  await mongoose.connection.db.createCollection('audit_logs', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['userId', 'action', 'timestamp'],
        properties: {
          userId: { bsonType: 'objectId' },
          action: { bsonType: 'string' },
          timestamp: { bsonType: 'date' }
        }
      }
    }
  });
}

async down(): Promise<void> {
  await mongoose.connection.db.dropCollection('audit_logs');
}
```

## 🔧 Application Integration

### Automatic Migration on Startup

Migration service tự động chạy khi ứng dụng khởi động:

```typescript
// In your app startup (already integrated in db.ts)
import { getMigrationService } from "./migrations";

const migrationService = getMigrationService();
await migrationService.runOnStartup();
```

### Environment Configuration

```bash
# .env file
AUTO_MIGRATE=true        # Auto-run migrations in development
NODE_ENV=development     # Required for auto-migration
MONGO_URI=mongodb://localhost:27017/app002
```

### Programmatic Usage

```typescript
import { getMigrationService, MigrationManager } from "./migrations";

// Using service (recommended)
const service = getMigrationService();
await service.initialize();

const hasPending = await service.hasPendingMigrations();
if (hasPending) {
  const result = await service.runPendingMigrations();
  console.log(`Migrations run: ${result.migrationsRun}`);
}

// Using manager directly (advanced)
const manager = new MigrationManager({
  migrationsPath: "custom/path",
  timeoutMs: 120000,
});

await manager.initialize();
await manager.migrate();
```

## 📈 Monitoring & Troubleshooting

### Check Migration Health

```bash
npm run migrate:status
```

Sample output:

```
📋 Migration Status:
================================================================================
✅ Initial Schema Setup (v20250721000001) - APPLIED
   Description: Create initial indexes and constraints for all collections
   Applied: 2025-01-21T10:30:15.000Z

✅ Add Product Analytics Fields (v20250721000002) - APPLIED
   Description: Add analytics tracking fields to products for better inventory management
   Applied: 2025-01-21T10:31:22.000Z

⏳ Add Customer Analytics And Segmentation (v20250721000003) - PENDING
   Description: Add customer analytics, segmentation, and behavior tracking fields

📊 Summary: 2 applied, 1 pending
```

### Common Issues & Solutions

#### Issue: Migration Timeout

```
Error: Migration timeout
```

**Solution**: Increase timeout in migration config:

```typescript
const manager = new MigrationManager({
  timeoutMs: 300000, // 5 minutes
});
```

#### Issue: Index Creation Failed

```
Error: Index with name already exists
```

**Solution**: Check if index exists before creating:

```typescript
try {
  await collection.createIndex(indexSpec, options);
} catch (error: any) {
  if (error.code !== 11000) {
    // Ignore duplicate key error
    throw error;
  }
}
```

#### Issue: Migration Stuck in PENDING

```
Migration shows as PENDING but should be APPLIED
```

**Solution**: Check migration record manually:

```javascript
db.migrations.find({ name: "Migration Name" });
```

### Performance Considerations

1. **Index Creation**: Use `background: true` for large collections
2. **Bulk Operations**: Process large datasets in chunks
3. **Memory Usage**: Stream large result sets instead of loading all into memory

## 🔒 Production Deployment

### Pre-deployment Checklist

- [ ] Test migrations on staging environment
- [ ] Backup production database
- [ ] Verify rollback procedures work
- [ ] Check migration execution time
- [ ] Ensure no breaking schema changes
- [ ] Test application functionality post-migration

### Production Migration Workflow

1. **Backup Database**

```bash
mongodump --uri="production-connection-string"
```

2. **Deploy Code** (without running migrations)

3. **Run Migrations Manually**

```bash
NODE_ENV=production npm run migrate:dry   # Dry run first
NODE_ENV=production npm run migrate       # Actual run
```

4. **Verify Application Health**

5. **Monitor for Issues**

### Rollback Strategy

If migration causes issues:

1. **Stop Application Traffic**
2. **Rollback Migration**

```bash
npm run migrate:down "Migration Name"
```

3. **Restore Database Backup** (if needed)
4. **Deploy Previous Code Version**

## 📚 Advanced Topics

### Custom Migration Manager

```typescript
import { MigrationManager } from "./migrations";

const customManager = new MigrationManager({
  migrationsPath: "custom/migrations",
  collectionName: "custom_migrations",
  validateChecksums: true,
  timeoutMs: 180000,
  autoRun: false,
});
```

### Migration Dependencies

For migrations that depend on each other, use version ordering:

```
20250721000001_create_users.ts          # Must run first
20250721000002_add_user_indexes.ts      # Depends on users collection
20250721000003_create_user_audit.ts     # Depends on users structure
```

### Environment-Specific Migrations

```typescript
const isProduction = process.env.NODE_ENV === 'production';

async up(): Promise<void> {
  if (isProduction) {
    // Production-safe operations only
    await addIndexes();
  } else {
    // Development operations (data seeding, etc.)
    await addIndexes();
    await seedTestData();
  }
}
```

## 🎉 Kết Luận

Database Migration System cung cấp:

- ✅ **Safe schema evolution** với full rollback capability
- ✅ **Team collaboration** với version-controlled database changes
- ✅ **Production-ready** với comprehensive testing và monitoring
- ✅ **Developer-friendly** với rich CLI và programmatic API
- ✅ **Performance optimized** với transaction support và timeout handling

Migration system này đảm bảo database schema luôn consistent và synchronized across tất cả environments, từ development đến production! 🚀
