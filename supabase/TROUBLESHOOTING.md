# Supabase Local Development Troubleshooting

This guide helps you resolve common issues when running Supabase locally.

---

## 🚨 Common Issues

### 1. Migration Fails / Schema Errors

**Symptoms:**
```
ERROR: schema "business" does not exist
Applying migration XXX_*.sql... FAILED
```

**Cause:** Old database volume has broken schema or incompatible migrations

**Solution:** Clean up Docker volumes and start fresh

---

### 2. Port Already Allocated

**Symptoms:**
```
Bind for 0.0.0.0:54322 failed: port is already allocated
```

**Cause:** Another Supabase instance or Docker container is using the ports

**Solution:** Stop all Supabase instances and Docker containers

---

### 3. Rate Limit Errors

**Symptoms:**
```
toomanyrequests: Rate exceeded
failed to pull docker image
```

**Cause:** Docker Hub rate limiting (usually temporary)

**Solution:** Wait a few minutes and retry, or Docker will automatically retry

---

## 🔧 Troubleshooting Steps

### Step 1: Clean Up Docker Volumes

Choose one of the following:

#### Option A: Remove Supabase-specific volumes (Safe)
```bash
# Only removes volumes for this project
docker volume ls | grep supabase_db_lifo-app | awk '{print $2}' | xargs docker volume rm
```

#### Option B: Clean all unused volumes (More thorough)
```bash
# Removes all unused Docker volumes
docker system prune -f --volumes
```

### Step 2: Start Fresh
```bash
# Start Supabase (will apply migrations)
npm run supabase:start
```

---

## ✅ Expected Output (Success)

When Supabase starts successfully, you should see:

```
Starting database...
Initialising schema...
Seeding globals from roles.sql...
Applying migration 20251026181700_001_complete_schema.sql...
Started supabase local development setup.

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
  S3 Storage URL: http://127.0.0.1:54321/storage/v1/s3
         MCP URL: http://127.0.0.1:54321/mcp
    Database URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
     Mailpit URL: http://127.0.0.1:54324
```

**No errors!** ✨

---

## 🆘 Nuclear Option (If Nothing Else Works)

If the above steps don't work, try a complete Docker reset:

```bash
# 1. Stop Supabase
supabase stop --no-backup

# 2. Stop all Docker containers
docker stop $(docker ps -aq)

# 3. Remove all stopped containers
docker rm $(docker ps -aq)

# 4. Remove all volumes
docker volume prune -f

# 5. Start fresh
npm run supabase:start
```

⚠️ **Warning:** This will remove ALL Docker containers and volumes on your system, not just Supabase.

---

## 🔍 Useful Diagnostic Commands

### Check Supabase Status
```bash
npm run supabase:status
```

### Check Running Docker Containers
```bash
docker ps
```

### Check Docker Volumes
```bash
docker volume ls | grep supabase
```

### Check Port Usage
```bash
# Mac/Linux
lsof -i :54321
lsof -i :54322
lsof -i :54323
lsof -i :54324

# Or use netstat
netstat -an | grep 54322
```

### View Supabase Logs
```bash
docker logs supabase_db_lifo-app
docker logs supabase_kong_lifo-app
```

---

## 📋 Quick Reference

### Daily Development
```bash
# Start Supabase
npm run supabase:start

# Check status
npm run supabase:status

# Stop Supabase
npm run supabase:stop
```

### After Pulling Migration Changes
```bash
# Reset database with new migrations
supabase db reset

# Regenerate TypeScript types
npm run update-types
```

### Fresh Setup (New Team Members)
```bash
# 1. Clone repo and install dependencies
git clone <repo-url>
cd lifo-app
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your credentials

# 3. Start Supabase
npm run supabase:start

# 4. Generate types
npm run update-types

# 5. Start development server
npm run dev
```

---

## 🔗 Additional Resources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Docker Troubleshooting](https://docs.docker.com/config/daemon/)
- [Project CLAUDE.md](../CLAUDE.md) - Full development guide

---

## 💡 Tips

1. **Always check which branch you're on** before running migrations
   ```bash
   git branch --show-current
   ```

2. **Keep Docker Desktop running** before starting Supabase

3. **Check for port conflicts** if you have multiple projects

4. **Update Supabase CLI regularly**
   ```bash
   brew upgrade supabase
   ```

5. **Don't commit local Supabase files**
   - `supabase/.branches/`
   - `supabase/.temp/`
   - These are in `.gitignore`

---

## 🐛 Still Having Issues?

1. Check the [GitHub Issues](https://github.com/lifo-ai/lifo-app/issues)
2. Ask in the team Slack/Discord
3. Review `CLAUDE.md` for database migration documentation
4. Check Supabase CLI version: `supabase --version`
   - Should be v2.53.6 or higher

---

**Last Updated:** October 26, 2025 (Migration Reset)
