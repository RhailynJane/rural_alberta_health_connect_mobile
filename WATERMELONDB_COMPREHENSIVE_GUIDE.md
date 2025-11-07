# WatermelonDB Comprehensive Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Core Concepts](#core-concepts)
3. [Schema Design Best Practices](#schema-design-best-practices)
4. [Migrations - Critical Section](#migrations---critical-section)
5. [Models and Decorators](#models-and-decorators)
6. [Querying Patterns](#querying-patterns)
7. [Writers, Readers, and Transactions](#writers-readers-and-transactions)
8. [Performance Optimization](#performance-optimization)
9. [Synchronization](#synchronization)
10. [React Integration with withObservables](#react-integration-with-withobservables)
11. [Critical Pitfalls and Common Mistakes](#critical-pitfalls-and-common-mistakes)
12. [Troubleshooting Guide](#troubleshooting-guide)

---

## Introduction

WatermelonDB is a reactive database framework for React and React Native apps that scales from hundreds to tens of thousands of records. It provides:

- **Offline-first architecture**: Local-first data with optional cloud sync
- **Reactive**: Automatic UI updates when data changes
- **Lazy loading**: Efficient memory usage
- **Multi-threaded**: Queries run on a separate thread (native platforms)
- **Typed**: Full TypeScript support

### When to Use WatermelonDB

✅ **Good for:**
- Apps requiring offline functionality
- Complex relational data structures
- Apps with thousands of records
- Real-time UI updates based on data changes
- Mobile apps where SQLite is beneficial

❌ **Not ideal for:**
- Simple key-value storage (use AsyncStorage)
- Apps with minimal data persistence needs
- Simple todo apps with <100 records

---

## Core Concepts

### 1. Database Architecture

```
Database
  ├── Adapter (SQLite or LokiJS)
  ├── Schema (table definitions)
  ├── Migrations (schema evolution)
  └── Collections
       └── Models (records)
```

### 2. Reactive Data Flow

```
Database Change → Observable → Component Re-render
```

### 3. Threading Model

- **Main thread**: UI and business logic
- **Worker thread**: Database queries and operations (SQLite only)
- **Serialization layer**: Transfers data between threads

---

## Schema Design Best Practices

### Basic Schema Structure

```javascript
import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const schema = appSchema({
  version: 1,  // ⚠️ CRITICAL: Increment this when making changes
  tables: [
    tableSchema({
      name: 'posts',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'body', type: 'string' },
        { name: 'is_published', type: 'boolean' },
        { name: 'published_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'comments',
      columns: [
        { name: 'body', type: 'string' },
        { name: 'post_id', type: 'string', isIndexed: true },  // Foreign key
        { name: 'author_id', type: 'string', isIndexed: true }, // Foreign key
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
  ]
})
```

### Naming Conventions

```javascript
// ✅ GOOD - snake_case for database columns
{ name: 'created_at', type: 'number' }
{ name: 'author_id', type: 'string' }
{ name: 'is_verified', type: 'boolean' }

// ❌ BAD - camelCase in database (causes sync issues)
{ name: 'createdAt', type: 'number' }
{ name: 'authorId', type: 'string' }
```

**Critical Rule:** Always use `snake_case` for column names in the schema, then use camelCase in your Model with decorators.

### Column Types

```javascript
// Available types:
'string'   // TEXT in SQLite
'number'   // INTEGER or REAL in SQLite (stores timestamps as milliseconds)
'boolean'  // INTEGER (0 or 1) in SQLite
```

### Indexing Strategy

```javascript
// ✅ ALWAYS index foreign keys
{ name: 'post_id', type: 'string', isIndexed: true }

// ✅ Index frequently queried columns
{ name: 'email', type: 'string', isIndexed: true }
{ name: 'status', type: 'string', isIndexed: true }

// ❌ DON'T over-index (slows down writes)
// Only index columns used in WHERE clauses
```

### Optional Fields

```javascript
tableSchema({
  name: 'posts',
  columns: [
    { name: 'title', type: 'string' },                    // Required
    { name: 'subtitle', type: 'string', isOptional: true }, // Optional
  ]
})
```

**Important:** Optional fields can be `null`. Non-optional fields must always have a value.

### Timestamps - Best Practice

```javascript
// ✅ ALWAYS include these for sync and tracking
tableSchema({
  name: 'posts',
  columns: [
    // ... other columns
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ]
})
```

### Custom SQL Schema Modifications

```javascript
// Advanced: Modify generated SQL
tableSchema({
  name: 'tasks',
  columns: [...],
  unsafeSql: sql => sql.replace(/create table [^)]+\)/, '$& without rowid'),
})

// App-level SQL customization
appSchema({
  tables: [...],
  unsafeSql: (sql, kind) => {
    switch (kind) {
      case 'setup':
        return `create custom_table;${sql}`
      case 'create_indices':
      case 'drop_indices':
        return sql
      default:
        throw new Error('unexpected unsafeSql kind')
    }
  },
})
```

---

## Migrations - Critical Section

### ⚠️ CRITICAL RULES FOR MIGRATIONS

1. **NEVER modify existing migrations** - This will corrupt user databases
2. **ALWAYS increment schema version** when adding migrations
3. **Test migrations thoroughly** with production-like data
4. **Migrations run in sequence** - order matters
5. **Migrations are irreversible** - no rollback mechanism

### Migration Workflow

```javascript
// Step 1: Create migrations file
// model/migrations.js

import { schemaMigrations, createTable, addColumns } from '@nozbe/watermelondb/Schema/migrations'

export default schemaMigrations({
  migrations: [
    // Newest migrations first!
    {
      toVersion: 3,
      steps: [
        createTable({
          name: 'comments',
          columns: [
            { name: 'post_id', type: 'string', isIndexed: true },
            { name: 'body', type: 'string' },
          ],
        }),
      ],
    },
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'posts',
          columns: [
            { name: 'subtitle', type: 'string', isOptional: true },
            { name: 'is_pinned', type: 'boolean' },
          ],
        }),
      ],
    },
    // Older migrations below...
  ],
})
```

```javascript
// Step 2: Update schema version
// model/schema.js

export default appSchema({
  version: 3,  // ⬅️ INCREMENT THIS!
  tables: [
    // Include ALL tables (old and new)
    tableSchema({
      name: 'comments',  // New table
      columns: [
        { name: 'post_id', type: 'string', isIndexed: true },
        { name: 'body', type: 'string' },
      ],
    }),
    // ...existing tables
  ]
})
```

```javascript
// Step 3: Configure adapter with migrations
import migrations from './model/migrations'

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  // For development: comment out migrations to reset DB
  // migrations: [],  // ⬅️ Uncomment to reset during dev
})
```

### Migration API

#### Create Table

```javascript
createTable({
  name: 'table_name',
  columns: [
    { name: 'column1', type: 'string' },
    { name: 'column2', type: 'number', isIndexed: true },
    { name: 'column3', type: 'boolean', isOptional: true },
  ],
})
```

#### Add Columns

```javascript
addColumns({
  table: 'existing_table',
  columns: [
    { name: 'new_column', type: 'string', isOptional: true },
    // ⚠️ New columns MUST be optional or have a default value
  ],
})
```

#### Unsafe SQL (Last Resort)

```javascript
// Use only when standard migrations don't work
{
  toVersion: 5,
  steps: [
    {
      type: 'sql',
      sql: 'CREATE INDEX IF NOT EXISTS custom_index ON posts (title, author_id)',
    },
  ],
}
```

### Migration Sync Configuration

```javascript
// For NEW apps:
await synchronize({
  database,
  migrationsEnabledAtVersion: 1,
  // ...
})

// For EXISTING apps adding migration support:
await synchronize({
  database,
  migrationsEnabledAtVersion: 10,  // Last version BEFORE migration support
  // ...
})
```

**Critical:** The adapter must also be configured:

```javascript
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  migrationsEnabledAtVersion: 1,  // Must match synchronize config
})
```

### Migration Testing Checklist

- [ ] Test migration on empty database
- [ ] Test migration with existing data
- [ ] Test migration sequence (multiple versions)
- [ ] Test downgrade scenario (fresh install)
- [ ] Test on both iOS and Android
- [ ] Test with sync enabled
- [ ] Verify all indexes are created
- [ ] Check data integrity after migration

### Common Migration Patterns

#### Adding a Nullable Foreign Key

```javascript
{
  toVersion: 5,
  steps: [
    addColumns({
      table: 'posts',
      columns: [
        { name: 'category_id', type: 'string', isOptional: true, isIndexed: true },
      ],
    }),
  ],
}
```

#### Renaming Columns (Requires Data Migration)

```javascript
// ⚠️ WatermelonDB doesn't support column rename
// You must: add new column → copy data → delete old column

{
  toVersion: 6,
  steps: [
    // 1. Add new column
    addColumns({
      table: 'posts',
      columns: [
        { name: 'author_name', type: 'string', isOptional: true },
      ],
    }),
    // 2. Copy data
    {
      type: 'sql',
      sql: 'UPDATE posts SET author_name = author WHERE author_name IS NULL',
    },
    // 3. Delete old column (not directly supported - must use SQL)
    {
      type: 'sql',
      sql: 'ALTER TABLE posts DROP COLUMN author',
    },
  ],
}
```

---

## Models and Decorators

### Basic Model Structure

```javascript
import { Model } from '@nozbe/watermelondb'
import { field, text, date, readonly, relation, children, lazy } from '@nozbe/watermelondb/decorators'

export default class Post extends Model {
  static table = 'posts'

  static associations = {
    comments: { type: 'has_many', foreignKey: 'post_id' },
    categories: { type: 'belongs_to', key: 'category_id' },
  }

  // Fields (match schema columns)
  @text('title') title           // snake_case → camelCase
  @text('body') body
  @field('is_published') isPublished
  @date('published_at') publishedAt

  // Timestamps
  @readonly @date('created_at') createdAt
  @readonly @date('updated_at') updatedAt

  // Relations
  @children('comments') comments
  @relation('categories', 'category_id') category

  // Custom queries
  @lazy publishedComments = this.comments.extend(
    Q.where('is_published', true)
  )

  // Computed properties
  get excerpt() {
    return this.body.substring(0, 100) + '...'
  }
}
```

### Decorator Reference

#### @field - Basic Fields

```javascript
@field('column_name') propertyName
```

Use for: `boolean`, `number`, `string` types

#### @text - String Fields (with Sanitization)

```javascript
@text('column_name') propertyName
```

Use instead of `@field` for strings - provides better sanitization

#### @date - Timestamp Fields

```javascript
@date('column_name') propertyName
```

**Important:** Converts between `number` (stored) and `Date` (used in code)

```javascript
// In schema:
{ name: 'created_at', type: 'number' }

// In model:
@date('created_at') createdAt  // Type: Date

// Usage:
post.createdAt // Date object
post.createdAt.getTime() // milliseconds
```

#### @readonly - Immutable Fields

```javascript
@readonly @date('created_at') createdAt
```

Prevents accidental modification in `update()` calls

#### @relation - Belongs-to Relationship

```javascript
static associations = {
  users: { type: 'belongs_to', key: 'author_id' },
}

@relation('users', 'author_id') author
```

**Usage:**

```javascript
const author = await post.author.fetch()  // Promise<User>
const author = await post.author          // Shortcut syntax

// Observe changes
post.author.observe()  // Observable<User>
```

#### @immutableRelation - Performance Optimization

```javascript
@immutableRelation('users', 'author_id') author
```

Use when relation will **never change** after creation - better performance

#### @children - Has-many Relationship

```javascript
static associations = {
  comments: { type: 'has_many', foreignKey: 'post_id' },
}

@children('comments') comments
```

**Usage:**

```javascript
const comments = await post.comments.fetch()  // Promise<Comment[]>
const comments = await post.comments          // Shortcut syntax

// Observe changes
post.comments.observe()  // Observable<Comment[]>
post.comments.observeCount()  // Observable<number>
```

#### @lazy - Lazy Evaluation

```javascript
@lazy verifiedComments = this.comments.extend(
  Q.where('is_verified', true)
)
```

Defers computation until first access - use for expensive operations

### Computed Properties

```javascript
class Post extends Model {
  @text('body') body

  // Simple getter
  get excerpt() {
    return this.body.substring(0, 100)
  }

  // With date logic
  @date('archived_at') archivedAt

  get isRecentlyArchived() {
    return this.archivedAt &&
      this.archivedAt.getTime() > Date.now() - 7 * 24 * 3600 * 1000
  }
}
```

**Important:** Getters are NOT reactive. Use RxJS observables for reactive computed properties.

### Advanced: Reactive Computed Fields

```javascript
import { lazy } from '@nozbe/watermelondb/decorators'
import { distinctUntilChanged, map } from 'rxjs/operators'

class Post extends Model {
  @children('comments') comments

  // Simple reactive field
  @lazy isPopular = this.comments.observeCount().pipe(
    map(count => count > 10),
    distinctUntilChanged()
  )

  // Complex reactive field with conditional logic
  @lazy popularity = this.observe().pipe(
    distinctUntilKeyChanged('isStarred'),
    switchMap(post =>
      post.isStarred
        ? of$(100)  // Starred posts always have max popularity
        : this.comments.observeCount().pipe(map(count => count))
    ),
    distinctUntilChanged(),
  )
}
```

### Many-to-Many Relationships

Requires a **pivot table**:

```javascript
// Schema
tableSchema({ name: 'posts', columns: [...] })
tableSchema({ name: 'tags', columns: [...] })
tableSchema({
  name: 'post_tags',  // Pivot table
  columns: [
    { name: 'post_id', type: 'string', isIndexed: true },
    { name: 'tag_id', type: 'string', isIndexed: true },
  ]
})

// Pivot Model
class PostTag extends Model {
  static table = 'post_tags'
  static associations = {
    posts: { type: 'belongs_to', key: 'post_id' },
    tags: { type: 'belongs_to', key: 'tag_id' },
  }

  @immutableRelation('posts', 'post_id') post
  @immutableRelation('tags', 'tag_id') tag
}

// Post Model
class Post extends Model {
  static table = 'posts'
  static associations = {
    post_tags: { type: 'has_many', foreignKey: 'post_id' },
  }

  @children('post_tags') postTags

  // Query for tags
  @lazy tags = this.collections
    .get('tags')
    .query(Q.on('post_tags', 'post_id', this.id))
}
```

---

## Querying Patterns

### Basic Queries

```javascript
import { Q } from '@nozbe/watermelondb'

// Get collection
const postsCollection = database.get('posts')

// Query with single condition
const publishedPosts = await postsCollection
  .query(
    Q.where('is_published', true)
  )
  .fetch()

// Query with multiple conditions (AND logic)
const posts = await postsCollection
  .query(
    Q.where('is_published', true),
    Q.where('is_featured', true),
  )
  .fetch()
```

### Query Operators

```javascript
// Equality
Q.where('status', 'published')
Q.where('count', 5)

// Comparison
Q.where('likes', Q.gt(10))        // Greater than
Q.where('likes', Q.gte(10))       // Greater than or equal
Q.where('likes', Q.lt(100))       // Less than
Q.where('likes', Q.lte(100))      // Less than or equal
Q.where('author_id', Q.notEq(null))  // Not equal

// Between
Q.where('created_at', Q.between(startTime, endTime))

// IN clause
Q.where('status', Q.oneOf(['draft', 'published']))

// NOT IN clause
Q.where('status', Q.notIn(['archived', 'deleted']))

// LIKE (SQL) - case sensitive
Q.where('title', Q.like('%react%'))

// Null checks
Q.where('deleted_at', Q.eq(null))
Q.where('deleted_at', Q.notEq(null))
```

### AND / OR Logic

```javascript
// AND (default - multiple conditions)
postsCollection.query(
  Q.where('is_published', true),
  Q.where('is_featured', true),
)

// OR
postsCollection.query(
  Q.or(
    Q.where('is_featured', true),
    Q.where('is_starred', true),
  )
)

// Complex: (is_featured OR is_starred) AND is_published
postsCollection.query(
  Q.where('is_published', true),
  Q.or(
    Q.where('is_featured', true),
    Q.where('is_starred', true),
  )
)

// Nested AND/OR
postsCollection.query(
  Q.where('archived_at', Q.notEq(null)),
  Q.or(
    Q.where('is_verified', true),
    Q.and(
      Q.where('likes', Q.gt(10)),
      Q.where('dislikes', Q.lt(5))
    )
  )
)
// Equivalent to: archivedAt !== null && (isVerified || (likes > 10 && dislikes < 5))
```

### JOIN Queries (Querying Related Tables)

```javascript
// Shortcut syntax: Q.on(relatedTable, column, value)
const commentsCollection = database.get('comments')

commentsCollection.query(
  Q.on('posts', 'author_id', john.id),
)

// Full syntax with operators
commentsCollection.query(
  Q.on('posts', Q.where('is_published', true)),
  Q.on('posts', Q.where('likes', Q.gt(10))),
)

// Multiple conditions on related table
commentsCollection.query(
  Q.on('posts',
    Q.where('is_published', true),
    Q.where('category', 'tech'),
  )
)
```

### Deep Joins (Grandparent Relations)

```javascript
// ⚠️ Requires explicit table declaration
tasksCollection.query(
  Q.experimentalNestedJoin('projects', 'teams'),
  Q.on('projects', Q.on('teams', 'name', 'Engineering')),
)
```

### Q.on within AND/OR

```javascript
// ⚠️ Requires explicit table declaration
tasksCollection.query(
  Q.experimentalJoinTables(['projects']),
  Q.or(
    Q.where('is_followed', true),
    Q.on('projects', 'is_followed', true),
  ),
)
```

### Sorting

```javascript
// Ascending
postsCollection.query(
  Q.sortBy('created_at', Q.asc)
)

// Descending
postsCollection.query(
  Q.sortBy('created_at', Q.desc)
)

// Multiple sort criteria
postsCollection.query(
  Q.sortBy('is_pinned', Q.desc),  // Pinned first
  Q.sortBy('created_at', Q.desc), // Then by date
)
```

### Limiting Results

```javascript
postsCollection.query(
  Q.sortBy('created_at', Q.desc),
  Q.take(10)  // LIMIT 10
)

// Skip + Take (pagination)
postsCollection.query(
  Q.sortBy('created_at', Q.desc),
  Q.skip(20),   // OFFSET 20
  Q.take(10),   // LIMIT 10
)
```

### Unsafe Raw SQL Queries

```javascript
// ⚠️ Use sparingly - loses type safety and cross-platform compatibility
postsCollection.query(
  Q.unsafeSqlQuery(
    'SELECT * FROM posts WHERE created_at > ?',
    [Date.now() - 7 * 24 * 3600 * 1000]
  )
)

// With JOINs - requires table declaration
commentsCollection.query(
  Q.experimentalJoinTables(['posts']),
  Q.unsafeSqlQuery(
    'SELECT comments.* FROM comments ' +
    'LEFT JOIN posts ON comments.post_id = posts.id ' +
    'WHERE posts.is_published = 1'
  )
)
```

**Critical:** Always use placeholders (`?`) for values to prevent SQL injection!

### Unsafe Raw Data Fetching

```javascript
// Fetch raw objects instead of Model instances
const rawData = await postsCollection.query(
  Q.unsafeSqlQuery(
    'SELECT posts.*, COUNT(comments.id) as comment_count ' +
    'FROM posts ' +
    'LEFT JOIN comments ON posts.id = comments.post_id ' +
    'GROUP BY posts.id'
  )
).unsafeFetchRaw()

// rawData is an array of plain objects, NOT Post instances
// ⚠️ Do NOT mutate these objects!
```

### Observing Queries

```javascript
// Observe array of records
const postsObservable = postsCollection
  .query(Q.where('is_published', true))
  .observe()

postsObservable.subscribe(posts => {
  console.log('Published posts:', posts)
})

// Observe count
const countObservable = postsCollection
  .query(Q.where('is_published', true))
  .observeCount()

countObservable.subscribe(count => {
  console.log('Published posts count:', count)
})

// Observe with specific columns (for sorted lists)
const sortedPostsObservable = postsCollection
  .query(Q.where('is_published', true))
  .observeWithColumns(['likes', 'created_at'])

// Re-emits when 'likes' or 'created_at' changes on matched records
```

**Critical Distinction:**
- `observe()` - Emits when records are **added/removed** from query results
- `observeWithColumns(['col'])` - Also emits when **specified columns change** on matched records

### Fetching vs Observing

```javascript
// Fetch once (Promise)
const posts = await postsCollection.query(...).fetch()
const count = await postsCollection.query(...).fetchCount()
const ids = await postsCollection.query(...).fetchIds()

// Observe changes (Observable)
const posts$ = postsCollection.query(...).observe()
const count$ = postsCollection.query(...).observeCount()

// Shortcut syntax
const posts = await post.comments  // Same as: await post.comments.fetch()
const count = await post.comments.count  // Same as: await post.comments.fetchCount()
```

### Performance: Query Without Conditions

```javascript
// ⚠️ AVOID - fetches ALL records
const allComments = await database.get('comments').query().fetch()

// ✅ BETTER - add some filtering
const recentComments = await database.get('comments').query(
  Q.where('created_at', Q.gt(Date.now() - 30 * 24 * 3600 * 1000))
).fetch()
```

---

## Writers, Readers, and Transactions

### The Writer/Reader Model

**Golden Rule:** All database modifications MUST happen inside a `writer` block.

```javascript
// ❌ WRONG - will throw error
post.title = 'New title'

// ✅ CORRECT
await post.update(post => {
  post.title = 'New title'
})
```

### Create Records

```javascript
const newPost = await database.write(async () => {
  return await database.get('posts').create(post => {
    post.title = 'My new post'
    post.body = 'Lorem ipsum...'
    post.isPublished = false
  })
})
```

**With Relations:**

```javascript
const newComment = await database.write(async () => {
  return await database.get('comments').create(comment => {
    comment.post.set(post)  // Set belongs-to relation
    comment.author.set(user)
    comment.body = 'Great post!'
  })
})
```

### Update Records

```javascript
await database.write(async () => {
  await post.update(post => {
    post.title = 'Updated title'
    post.isPublished = true
  })
})
```

### Delete Records

```javascript
// Soft delete (marks as deleted, used for sync)
await database.write(async () => {
  await post.markAsDeleted()
})

// Permanent delete (immediately removes from DB)
await database.write(async () => {
  await post.destroyPermanently()
})
```

**Cascading Deletes:**

```javascript
class Post extends Model {
  @children('comments') comments

  async markAsDeleted() {
    await this.comments.destroyAllPermanently()
    await super.markAsDeleted()
  }
}
```

### Batch Operations - CRITICAL for Performance

```javascript
// ❌ SLOW - creates multiple transactions
await database.write(async () => {
  await post1.update(p => p.title = 'New')
})
await database.write(async () => {
  await post2.update(p => p.title = 'New')
})

// ✅ FAST - single transaction
await database.write(async () => {
  await database.batch(
    post1.prepareUpdate(p => p.title = 'New'),
    post2.prepareUpdate(p => p.title = 'New'),
  )
})
```

**Full Batch Example:**

```javascript
await database.write(async () => {
  await database.batch(
    // Update existing
    post.prepareUpdate(post => {
      post.title = 'Updated'
    }),

    // Create new
    database.get('comments').prepareCreate(comment => {
      comment.post.set(post)
      comment.body = 'Comment body'
    }),

    // Delete
    oldComment.prepareMarkAsDeleted(),
  )
})
```

**Critical:** Use `batch()` whenever performing multiple operations!

### Model Writer Methods

```javascript
import { writer } from '@nozbe/watermelondb/decorators'

class Post extends Model {
  @children('comments') comments

  // Simple writer
  @writer async publish() {
    await this.update(post => {
      post.isPublished = true
      post.publishedAt = new Date()
    })
  }

  // Writer with parameters
  @writer async addComment(body, author) {
    const newComment = await this.collections.get('comments').create(comment => {
      comment.post.set(this)
      comment.author.set(author)
      comment.body = body
    })
    return newComment
  }

  // Writer with batching
  @writer async publishWithComment(commentBody) {
    await this.batch(
      this.prepareUpdate(post => {
        post.isPublished = true
      }),
      this.collections.get('comments').prepareCreate(comment => {
        comment.post.set(this)
        comment.body = commentBody
      })
    )
  }
}

// Usage
await post.publish()
const comment = await post.addComment('Great!', user)
```

### Nesting Writers

```javascript
// ❌ WRONG - will deadlock
@writer async method1() {
  await this.method2()  // method2 is also a @writer
}

// ✅ CORRECT - use callWriter
@writer async method1() {
  await this.callWriter(() => this.method2())
}

// Alternative pattern
@writer async method1() {
  await database.write(async writer => {
    await writer.callWriter(() => post.method2())
  })
}
```

### Reader Methods - Data Consistency

```javascript
import { reader } from '@nozbe/watermelondb/decorators'

class Blog extends Model {
  @children('posts') posts

  // Ensures no changes during export
  @reader async exportBlog() {
    const posts = await this.posts.fetch()
    const comments = await this.allComments.fetch()

    // No database modifications can happen here
    return {
      posts: posts.map(p => p._raw),
      comments: comments.map(c => c._raw),
    }
  }
}
```

**Use Case:** Reading multiple related records where consistency is critical (e.g., exports, reports)

---

## Performance Optimization

### 1. Batching - The #1 Optimization

```javascript
// ❌ SLOW - 100 separate transactions
for (let i = 0; i < 100; i++) {
  await database.write(async () => {
    await database.get('posts').create(post => {
      post.title = `Post ${i}`
    })
  })
}

// ✅ FAST - 1 transaction
await database.write(async () => {
  const preparedPosts = Array.from({ length: 100 }, (_, i) =>
    database.get('posts').prepareCreate(post => {
      post.title = `Post ${i}`
    })
  )
  await database.batch(...preparedPosts)
})
```

**Performance Impact:** Batching is typically **10-100x faster** for bulk operations!

### 2. Indexing Strategy

```javascript
// ✅ Index foreign keys
{ name: 'post_id', type: 'string', isIndexed: true }

// ✅ Index frequently filtered columns
{ name: 'status', type: 'string', isIndexed: true }
{ name: 'created_at', type: 'number', isIndexed: true }

// ❌ Don't over-index
{ name: 'description', type: 'string' }  // Rarely queried - don't index
```

### 3. Query Optimization

```javascript
// ❌ SLOW - fetches all posts then filters in JS
const posts = await database.get('posts').query().fetch()
const recentPosts = posts.filter(p => p.createdAt > sevenDaysAgo)

// ✅ FAST - filters in database
const recentPosts = await database.get('posts').query(
  Q.where('created_at', Q.gt(sevenDaysAgo.getTime()))
).fetch()
```

### 4. Observing with Throttling

```javascript
// Default: throttled to 250ms
post.comments.observeCount()

// Disable throttling (use with caution)
post.comments.observeCount(false)
```

### 5. Lazy Relations

```javascript
// ✅ Use @lazy for expensive queries
@lazy verifiedComments = this.comments.extend(
  Q.where('is_verified', true)
)

// Only computed when accessed:
const verified = await post.verifiedComments.fetch()
```

### 6. Immutable Relations

```javascript
// ✅ Use @immutableRelation for relations that never change
@immutableRelation('users', 'author_id') author

// Faster than:
@relation('users', 'author_id') author
```

### 7. Pagination

```javascript
// Fetch in chunks
const pageSize = 20
const page = 2

const posts = await database.get('posts').query(
  Q.sortBy('created_at', Q.desc),
  Q.skip(page * pageSize),
  Q.take(pageSize),
).fetch()
```

### 8. Fetch Only What You Need

```javascript
// ❌ Fetches full records
const posts = await postsCollection.query(...).fetch()

// ✅ Fetch only IDs (much faster)
const postIds = await postsCollection.query(...).fetchIds()

// ✅ Fetch only count
const postCount = await postsCollection.query(...).fetchCount()
```

### 9. JSI Mode (React Native)

```javascript
// Enable JSI for up to 10x faster queries
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true,  // ⬅️ ENABLE THIS
})
```

**Requirements:**
- React Native 0.63+
- Additional setup on Android (see WatermelonDB docs)
- Works out of the box on iOS

### 10. Avoid N+1 Queries

```javascript
// ❌ BAD - N+1 query problem
const posts = await database.get('posts').query().fetch()
for (const post of posts) {
  const author = await post.author.fetch()  // N queries!
  console.log(author.name)
}

// ✅ GOOD - fetch authors in bulk
const posts = await database.get('posts').query().fetch()
const authorIds = [...new Set(posts.map(p => p._raw.author_id))]
const authors = await database.get('users').query(
  Q.where('id', Q.oneOf(authorIds))
).fetch()
const authorsMap = new Map(authors.map(a => [a.id, a]))

posts.forEach(post => {
  const author = authorsMap.get(post._raw.author_id)
  console.log(author.name)
})
```

---

## Synchronization

### Basic Sync Setup

```javascript
import { synchronize } from '@nozbe/watermelondb/sync'

async function sync() {
  await synchronize({
    database,

    pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
      const params = new URLSearchParams({
        last_pulled_at: lastPulledAt?.toString() || '0',
        schema_version: schemaVersion.toString(),
        migration: JSON.stringify(migration),
      })

      const response = await fetch(`https://api.example.com/sync?${params}`)
      const { changes, timestamp } = await response.json()

      return { changes, timestamp }
    },

    pushChanges: async ({ changes, lastPulledAt }) => {
      await fetch(`https://api.example.com/sync?last_pulled_at=${lastPulledAt}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      })
    },

    migrationsEnabledAtVersion: 1,
  })
}
```

### Pull Changes Response Format

```javascript
// Backend must return:
{
  changes: {
    posts: {
      created: [
        { id: 'post1', title: 'Post 1', created_at: 1234567890 },
      ],
      updated: [
        { id: 'post2', title: 'Updated Post' },
      ],
      deleted: ['post3'],
    },
    comments: {
      created: [],
      updated: [],
      deleted: [],
    },
  },
  timestamp: 1234567890123  // Server timestamp
}
```

### Push Changes Format

```javascript
// WatermelonDB sends:
{
  posts: {
    created: [/* new posts */],
    updated: [/* changed posts */],
    deleted: ['id1', 'id2'],  // IDs only
  },
  comments: {
    created: [/* new comments */],
    updated: [/* changed comments */],
    deleted: [],
  },
}
```

### Migration-Aware Sync

When schema changes, clients need migrations:

```javascript
// pullChanges receives migration info
pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
  // migration = {
  //   from: 5,  // Client's current schema version
  //   tables: ['posts', 'comments'],  // Tables that exist
  //   columns: [
  //     { table: 'posts', columns: ['title', 'body'] }
  //   ]
  // }

  // Backend should:
  // 1. Return only data the client can understand
  // 2. Omit new columns the client doesn't have
  // 3. Include all records if client needs full resync
}
```

### Conflict Resolution

**Strategy:** Last Write Wins (based on `updated_at`)

```javascript
// Backend logic (pseudo-code)
function mergeChanges(serverRecord, clientRecord) {
  if (clientRecord.updated_at > serverRecord.updated_at) {
    return clientRecord  // Client wins
  } else {
    return serverRecord  // Server wins
  }
}
```

### Sync Logging

```javascript
import SyncLogger from '@nozbe/watermelondb/sync/SyncLogger'

const logger = new SyncLogger(10)  // Keep last 10 sync logs

await synchronize({
  database,
  log: logger.newLog(),
  pullChanges: /* ... */,
  pushChanges: /* ... */,
})

// Check logs
console.log(logger.formattedLogs)
```

### Sync Error Handling

```javascript
async function syncWithRetry() {
  try {
    await synchronize({ /* ... */ })
  } catch (error) {
    console.error('Sync failed:', error)

    // Retry once
    try {
      await synchronize({ /* ... */ })
    } catch (retryError) {
      // Give up - show error to user
      alert('Unable to sync. Please try again later.')
    }
  }
}
```

### Automatic Sync Triggers

```javascript
import { debounce } from 'lodash'

// Sync when data changes (debounced)
const debouncedSync = debounce(() => syncWithRetry(), 5000)

database.withChangesForTables(['posts', 'comments']).subscribe(() => {
  debouncedSync()
})

// Sync when app comes to foreground
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    syncWithRetry()
  }
})

// Sync when network reconnects
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    syncWithRetry()
  }
})
```

### Replacement Sync Strategy

Alternative to incremental sync - replaces entire local DB:

```javascript
pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
  const response = await fetch('https://api.example.com/full-sync')
  const { changes, timestamp } = await response.json()

  return {
    changes,
    timestamp,
    experimentalStrategy: 'replacement',  // ⬅️ Key difference
  }
}
```

**Use Case:** When incremental sync is too complex or unreliable

---

## React Integration with withObservables

### Basic Usage

```javascript
import { withObservables } from '@nozbe/watermelondb/react'

// Dumb component
const Comment = ({ comment }) => (
  <div>
    <p>{comment.body}</p>
    <span>By {comment.author.name}</span>
  </div>
)

// Enhance with observables
const enhance = withObservables(['comment'], ({ comment }) => ({
  comment: comment.observe(),  // Re-render when comment changes
}))

export default enhance(Comment)
```

### Observing Relations

```javascript
const Comment = ({ comment, author }) => (
  <div>
    <p>{comment.body}</p>
    <span>By {author.name}</span>
  </div>
)

const enhance = withObservables(['comment'], ({ comment }) => ({
  comment,
  author: comment.author,  // Shortcut for comment.author.observe()
}))

export default enhance(Comment)
```

### Observing Counts

```javascript
const Post = ({ post, commentCount }) => (
  <div>
    <h1>{post.title}</h1>
    <span>{commentCount} comments</span>
  </div>
)

const enhance = withObservables(['post'], ({ post }) => ({
  post,
  commentCount: post.comments.observeCount(),
}))

export default enhance(Post)
```

### Observing Lists

```javascript
const Post = ({ post, comments }) => (
  <div>
    <h1>{post.title}</h1>
    {comments.map(comment =>
      <EnhancedComment key={comment.id} comment={comment} />
    )}
  </div>
)

const enhance = withObservables(['post'], ({ post }) => ({
  post,
  comments: post.comments,  // Observes the list
}))
```

### Observing Sorted Lists - CRITICAL

```javascript
import { sortWith, descend, prop } from 'ramda'

const sortComments = sortWith([
  descend(prop('likes'))
])

const CommentList = ({ comments }) => (
  <div>
    {sortComments(comments).map(comment =>
      <EnhancedComment key={comment.id} comment={comment} />
    )}
  </div>
)

// ⚠️ MUST use observeWithColumns for sorted lists!
const enhance = withObservables(['post'], ({ post }) => ({
  comments: post.comments.observeWithColumns(['likes'])
  // Re-renders when 'likes' changes on any comment
}))
```

**Critical:** Use `observeWithColumns()` when sort order depends on field values!

### Second-Level Relations

```javascript
// Using compose
import { compose } from '@nozbe/watermelondb/react'

const PostComponent = ({ post, author, contact }) => (
  <div>
    <h1>{post.title}</h1>
    <p>By {author.name} ({contact.email})</p>
  </div>
)

const enhance = compose(
  withObservables(['post'], ({ post }) => ({
    post,
    author: post.author,
  })),
  withObservables(['author'], ({ author }) => ({
    contact: author.contact,
  }))
)

export default enhance(PostComponent)
```

```javascript
// Using switchMap
import { switchMap } from 'rxjs/operators'

const enhance = withObservables(['post'], ({ post }) => ({
  post,
  author: post.author,
  contact: post.author.observe().pipe(
    switchMap(author => author.contact.observe())
  )
}))
```

### Handling Nullable Relations

```javascript
import { of } from 'rxjs'

const enhance = withObservables(['post'], ({ post }) => ({
  post,
  author: post.author,
  contact: post.author.observe().pipe(
    switchMap(author => author ? author.contact : of(null))
  )
}))
```

### Observing from Database

```javascript
// Observe specific record by ID
const enhance = withObservables(['postId'], ({ postId, database }) => ({
  post: database.get('posts').findAndObserve(postId)
}))

// Observe query results
const enhance = withObservables(['database'], ({ database }) => ({
  posts: database.get('posts').query(
    Q.where('is_published', true)
  ).observe()
}))
```

### Reactive Computed Properties

```javascript
// In model
class Post extends Model {
  @lazy isPopular = this.comments.observeCount().pipe(
    map(count => count > 10),
    distinctUntilChanged()
  )
}

// In component
const PostComponent = ({ post, isPopular }) => (
  <div>
    <h1>{post.title}</h1>
    {isPopular && <span>🔥 Popular!</span>}
  </div>
)

const enhance = withObservables(['post'], ({ post }) => ({
  post,
  isPopular: post.isPopular,  // Observable from model
}))
```

### Performance Tips

```javascript
// ✅ GOOD - observe only what you need
const enhance = withObservables(['post'], ({ post }) => ({
  commentCount: post.comments.observeCount(),  // Just the count
}))

// ❌ BAD - unnecessary observation
const enhance = withObservables(['post'], ({ post }) => ({
  comments: post.comments,  // Fetches all comments on every change
}))
```

---

## Critical Pitfalls and Common Mistakes

### 1. Schema Migration Mistakes

#### ❌ Modifying Existing Migrations

```javascript
// WRONG - Never change existing migrations!
{
  toVersion: 2,
  steps: [
    createTable({ name: 'posts', columns: [...] })
    // Added column later - BREAKS users on v2!
  ],
}
```

```javascript
// ✅ CORRECT - Always create new migration
{
  toVersion: 3,
  steps: [
    addColumns({
      table: 'posts',
      columns: [{ name: 'new_column', type: 'string', isOptional: true }]
    })
  ],
},
{
  toVersion: 2,
  steps: [
    createTable({ name: 'posts', columns: [...] })
  ],
}
```

#### ❌ Forgetting to Increment Schema Version

```javascript
// WRONG - Added migration but didn't update version
export default appSchema({
  version: 2,  // ⬅️ Still 2!
  tables: [...]
})

// Migration file has toVersion: 3 but schema version is 2
// Migration will NEVER run!
```

#### ❌ Adding Non-Optional Columns

```javascript
// WRONG - Existing records won't have this field!
addColumns({
  table: 'posts',
  columns: [
    { name: 'new_field', type: 'string' }  // NOT optional!
  ],
})

// ✅ CORRECT
addColumns({
  table: 'posts',
  columns: [
    { name: 'new_field', type: 'string', isOptional: true }
  ],
})
```

### 2. Writer/Reader Mistakes

#### ❌ Modifying Records Outside Writer

```javascript
// WRONG - Will throw error
post.title = 'New title'

// ✅ CORRECT
await post.update(post => {
  post.title = 'New title'
})
```

#### ❌ Not Using Batch for Multiple Operations

```javascript
// WRONG - Multiple transactions (slow)
await database.write(async () => {
  await post1.update(...)
})
await database.write(async () => {
  await post2.update(...)
})

// ✅ CORRECT - Single transaction
await database.write(async () => {
  await database.batch(
    post1.prepareUpdate(...),
    post2.prepareUpdate(...),
  )
})
```

#### ❌ Forgetting Await in Writers

```javascript
// WRONG - Update not awaited!
@writer async markAsSpam() {
  this.update(comment => {
    comment.isSpam = true
  })
}

// ✅ CORRECT
@writer async markAsSpam() {
  await this.update(comment => {
    comment.isSpam = true
  })
}
```

### 3. Query Mistakes

#### ❌ Filtering in JavaScript Instead of Database

```javascript
// WRONG - Fetches ALL posts
const posts = await database.get('posts').query().fetch()
const published = posts.filter(p => p.isPublished)

// ✅ CORRECT - Filters in database
const published = await database.get('posts').query(
  Q.where('is_published', true)
).fetch()
```

#### ❌ SQL Injection Vulnerability

```javascript
// WRONG - SQL injection risk!
Q.unsafeSqlQuery(`SELECT * FROM posts WHERE author_id = '${userId}'`)

// ✅ CORRECT - Use placeholders
Q.unsafeSqlQuery('SELECT * FROM posts WHERE author_id = ?', [userId])
```

#### ❌ Not Declaring Joined Tables

```javascript
// WRONG - Will fail or return incorrect results
commentsCollection.query(
  Q.or(
    Q.where('is_featured', true),
    Q.on('posts', 'is_featured', true),
  )
)

// ✅ CORRECT
commentsCollection.query(
  Q.experimentalJoinTables(['posts']),
  Q.or(
    Q.where('is_featured', true),
    Q.on('posts', 'is_featured', true),
  )
)
```

### 4. Observation Mistakes

#### ❌ Not Observing Sorted Lists Correctly

```javascript
// WRONG - Won't re-render when 'likes' changes!
const enhance = withObservables(['post'], ({ post }) => ({
  comments: post.comments.observe()
}))

// Component sorts by 'likes' but doesn't update when likes change

// ✅ CORRECT
const enhance = withObservables(['post'], ({ post }) => ({
  comments: post.comments.observeWithColumns(['likes'])
}))
```

#### ❌ Creating Memory Leaks

```javascript
// WRONG - Subscription never cleaned up
componentDidMount() {
  this.subscription = post.observe().subscribe(...)
  // Never unsubscribed!
}

// ✅ CORRECT
componentDidMount() {
  this.subscription = post.observe().subscribe(...)
}

componentWillUnmount() {
  this.subscription.unsubscribe()
}

// ✅ EVEN BETTER - Use withObservables (auto-cleanup)
```

### 5. Relation Mistakes

#### ❌ Using @relation Instead of @immutableRelation

```javascript
// WRONG - Less efficient for relations that never change
@relation('users', 'author_id') author

// ✅ CORRECT - If author never changes
@immutableRelation('users', 'author_id') author
```

#### ❌ Circular Relations

```javascript
// WRONG - Circular dependency
class Post extends Model {
  @relation('users', 'author_id') author
}

class User extends Model {
  @relation('posts', 'user_id') post  // ⚠️ Circular!
}

// ✅ CORRECT - Use @children for reverse relation
class User extends Model {
  @children('posts') posts
}
```

### 6. Sync Mistakes

#### ❌ Not Handling Sync Errors

```javascript
// WRONG - Sync errors crash the app
await synchronize({ ... })

// ✅ CORRECT - Wrap in try-catch
try {
  await synchronize({ ... })
} catch (error) {
  console.error('Sync failed:', error)
  // Show error to user, retry, etc.
}
```

#### ❌ Syncing Too Frequently

```javascript
// WRONG - Syncs on every keystroke
database.withChangesForTables(['posts']).subscribe(() => {
  synchronize({ ... })
})

// ✅ CORRECT - Debounce sync calls
const debouncedSync = debounce(() => synchronize({ ... }), 5000)
database.withChangesForTables(['posts']).subscribe(debouncedSync)
```

#### ❌ Not Handling Migration Sync

```javascript
// WRONG - Doesn't tell backend about migrations
pullChanges: async ({ lastPulledAt }) => {
  // Ignores schemaVersion and migration params!
}

// ✅ CORRECT - Pass migration info to backend
pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
  const params = new URLSearchParams({
    last_pulled_at: lastPulledAt?.toString() || '0',
    schema_version: schemaVersion.toString(),
    migration: JSON.stringify(migration),
  })
  // Backend uses these to send compatible data
}
```

### 7. TypeScript Mistakes

#### ❌ Wrong Model Types

```javascript
// WRONG - Type doesn't match database
@date('created_at') createdAt: number  // Should be Date!

// ✅ CORRECT
@date('created_at') createdAt: Date
```

#### ❌ Not Typing Relations

```javascript
// WRONG - No type safety
@relation('users', 'author_id') author

// ✅ CORRECT
@relation('users', 'author_id') author: Relation<User>
```

### 8. Performance Mistakes

#### ❌ Not Using JSI on React Native

```javascript
// WRONG - Slow on React Native
const adapter = new SQLiteAdapter({
  schema,
  migrations,
})

// ✅ CORRECT - Up to 10x faster!
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true,
})
```

#### ❌ Not Indexing Foreign Keys

```javascript
// WRONG - Slow JOIN queries
{ name: 'post_id', type: 'string' }

// ✅ CORRECT - Fast JOINs
{ name: 'post_id', type: 'string', isIndexed: true }
```

### 9. Adapter Configuration Mistakes

#### ❌ Not Handling Setup Errors

```javascript
// WRONG - No error handling
const adapter = new SQLiteAdapter({ schema, migrations })

// ✅ CORRECT
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  onSetUpError: (error) => {
    console.error('Database setup failed:', error)
    // Offer user to clear app data or reinstall
  }
})
```

### 10. React Native Specific

#### ❌ Not Handling Android JSI Setup

```javascript
// WRONG - JSI enabled but not configured on Android
const adapter = new SQLiteAdapter({ jsi: true })
// Crashes on Android!

// ✅ CORRECT - Check platform or configure properly
const adapter = new SQLiteAdapter({
  jsi: Platform.OS === 'ios',  // Only iOS until Android is configured
})
```

---

## Troubleshooting Guide

### Issue: "Cannot modify record outside of a writer"

**Cause:** Trying to change a record without using `.update()`

**Solution:**

```javascript
// ❌ Wrong
post.title = 'New title'

// ✅ Correct
await post.update(post => {
  post.title = 'New title'
})
```

### Issue: "Database schema version mismatch"

**Cause:** Schema version doesn't match migrations

**Solution:**

1. Check schema version: `appSchema({ version: X })`
2. Check highest migration: `toVersion: Y`
3. Ensure X === Y

### Issue: Migrations not running

**Possible Causes:**

1. Schema version not incremented
2. Migrations array empty or misconfigured
3. Adapter not receiving migrations

**Solution:**

```javascript
// Verify all three are in sync:
// 1. Schema version
export default appSchema({ version: 3, ... })

// 2. Highest migration
schemaMigrations({
  migrations: [
    { toVersion: 3, steps: [...] },
    { toVersion: 2, steps: [...] },
  ]
})

// 3. Adapter configuration
const adapter = new SQLiteAdapter({
  schema,
  migrations,  // ⬅️ Must be passed!
})
```

### Issue: "Relation not found"

**Cause:** Missing or misconfigured association

**Solution:**

```javascript
class Comment extends Model {
  // Must define association
  static associations = {
    posts: { type: 'belongs_to', key: 'post_id' },
  }

  // Then can use relation
  @relation('posts', 'post_id') post
}
```

### Issue: Query returns no results (but records exist)

**Possible Causes:**

1. Wrong column name (snake_case vs camelCase)
2. Type mismatch (number vs string)
3. Missing index on joined table

**Solution:**

```javascript
// ❌ Wrong - camelCase
Q.where('postId', 'abc')

// ✅ Correct - snake_case
Q.where('post_id', 'abc')
```

### Issue: Slow queries on large datasets

**Solutions:**

1. Add indexes to filtered/joined columns
2. Use batching for bulk operations
3. Enable JSI on React Native
4. Fetch only needed data (count, IDs)

```javascript
// Instead of:
const posts = await postsCollection.query(...).fetch()

// Use:
const postCount = await postsCollection.query(...).fetchCount()
const postIds = await postsCollection.query(...).fetchIds()
```

### Issue: Component doesn't re-render when data changes

**Possible Causes:**

1. Not using `withObservables`
2. Not observing the relation
3. Using `fetch()` instead of `observe()`

**Solution:**

```javascript
// ❌ Wrong - fetches once
const [comments, setComments] = useState([])
useEffect(() => {
  post.comments.fetch().then(setComments)
}, [])

// ✅ Correct - observes changes
const enhance = withObservables(['post'], ({ post }) => ({
  comments: post.comments
}))
```

### Issue: App crashes on schema migration

**Solution:**

1. Test migration thoroughly
2. Add fallbacks:

```javascript
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  onSetUpError: (error) => {
    console.error('Migration failed:', error)
    // Offer user to reset database
  }
})
```

### Issue: Sync conflicts / data loss

**Solution:**

1. Implement proper conflict resolution
2. Use `updated_at` timestamps
3. Test offline scenarios thoroughly

```javascript
// Backend conflict resolution
if (clientRecord.updated_at > serverRecord.updated_at) {
  return clientRecord
} else {
  return serverRecord
}
```

### Issue: Memory leaks in React components

**Cause:** Not unsubscribing from observables

**Solution:**

```javascript
// ❌ Wrong
componentDidMount() {
  post.observe().subscribe(this.handleUpdate)
}

// ✅ Correct - Use withObservables (auto-cleanup)
const enhance = withObservables(['post'], ({ post }) => ({
  post
}))

// Or manually unsubscribe
componentDidMount() {
  this.subscription = post.observe().subscribe(this.handleUpdate)
}
componentWillUnmount() {
  this.subscription.unsubscribe()
}
```

### Issue: "Cannot read property '_raw' of undefined"

**Cause:** Trying to access deleted or non-existent record

**Solution:**

```javascript
// Add null checks
const post = await database.get('posts').find(id).catch(() => null)
if (!post) {
  return <div>Post not found</div>
}
```

### Debugging Tips

1. **Enable SQL logging:**

```javascript
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  // iOS/Android only
  experimentalUseJSI: true,
  onSetUpError: (error) => console.error(error),
})

// Log all SQL queries (development only)
if (__DEV__) {
  adapter.underlyingAdapter.setUpWithMigrations(
    database,
    schema,
    migrations,
    1,
    true  // ⬅️ Log SQL
  )
}
```

2. **Inspect raw data:**

```javascript
console.log(post._raw)  // See actual database values
```

3. **Test queries in isolation:**

```javascript
const query = database.get('posts').query(
  Q.where('is_published', true)
)
const results = await query.fetch()
console.log('Query results:', results.length)
```

4. **Check sync logs:**

```javascript
import SyncLogger from '@nozbe/watermelondb/sync/SyncLogger'

const logger = new SyncLogger(10)
await synchronize({ database, log: logger.newLog(), ... })

console.log(logger.formattedLogs)  // Detailed sync information
```

---

## Conclusion

WatermelonDB is a powerful tool for building offline-first React and React Native apps. Key takeaways:

1. **Always use batching** for multiple operations
2. **Never modify existing migrations**
3. **Index foreign keys and frequently queried columns**
4. **Use `withObservables` for reactive UI**
5. **Enable JSI on React Native for performance**
6. **Test migrations thoroughly before release**
7. **Use `observeWithColumns()` for sorted lists**
8. **Always use writers for database modifications**

By following these best practices and avoiding common pitfalls, you'll build fast, reliable, and maintainable database-driven applications.

---

## Additional Resources

- Official Docs: https://watermelondb.dev/
- GitHub: https://github.com/Nozbe/WatermelonDB
- Discord Community: https://discord.gg/watermelondb

Happy coding! 🍉
