# Plan: Complete the CRM Foundation

The CRM has a solid structure — 31 database tables, 19 routes, auth system, shared components, and 6 modules connected to the database via `useCrud`. However, several critical gaps remain.

---

## 1. Fix Critical: Missing `handle_new_user` Trigger

The `handle_new_user()` function exists but **no trigger is attached** to `auth.users`. Sign-up creates an auth user but no profile, company, roles, or permissions — breaking the entire app post-registration.

**Fix:** Create a migration to attach the trigger:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 2. Enable Auto-Confirm for Testing

Email verification is currently required, which blocks testing. Will enable auto-confirm so you can sign up and immediately use the CRM.

## 3. Connect Remaining Modules to Database

These routes currently use hardcoded/mock data and need to be wired to the DB:

| Route            | Current State     | Action                                                            |
| ---------------- | ----------------- | ----------------------------------------------------------------- |
| **Pipeline**     | Mock deal stages  | Connect to `deals` + `deal_stages` tables, build drag-drop Kanban |
| **Email**        | Static mock inbox | Connect to `email_conversations` + `email_messages` tables        |
| **Calendar**     | Placeholder       | Connect to `tasks` (by due_date) and show in calendar view        |
| **Reports**      | Placeholder       | Build real aggregation queries from leads/deals/invoices          |
| **AI Assistant** | Placeholder       | Add Lovable AI integration for CRM insights                       |
| **Team**         | Mock data         | Connect to `profiles` + `user_roles` tables for team management   |

## 4. Dashboard — Wire Real Metrics

Connect dashboard metric cards and charts to live database queries (leads count, deals pipeline value, overdue tasks, recent activity).

---

## Technical Details

- All DB-connected modules will use the existing `useCrud` hook pattern
- Pipeline Kanban will query `deal_stages` for columns and `deals` for cards
- Calendar will use a lightweight calendar component rendering tasks by `due_date`
- Reports will use direct Supabase queries for aggregations
- Team management will allow admins to invite users and assign roles
