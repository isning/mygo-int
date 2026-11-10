# Issue tracker

Provider: GitHub
Repository: isning/mygo-int
URL: https://github.com/isning/mygo-int

Use the `gh` CLI with an explicit `--repo isning/mygo-int`
argument to read and manage issues.

PRs as a request surface: off.

Creating or updating remote issues requires explicit user
authorization. This configuration alone does not authorize
remote mutations.

## Wayfinding operations

The canonical wayfinder map is a GitHub issue labelled `wayfinder:map`. Decision
tickets are native sub-issues, labelled `wayfinder:grilling`, `wayfinder:research`,
`wayfinder:prototype` or `wayfinder:task`. The assignee is the claim; leave new human
decision tickets unassigned. The developer driving this map is `isning`.

Explicit invocation of wayfinder authorizes its issue/label/comment and native
relationship operations within the chosen map. It does not authorize git pushes,
PR creation, implementation, or unrelated issue mutations.

Use `gh` with the explicit repository. Native relationships are required:

```bash
gh issue list --repo isning/mygo-int --label wayfinder:map --state open
gh api repos/isning/mygo-int/issues/MAP_NUMBER/sub_issues --paginate
gh api --method POST repos/isning/mygo-int/issues/MAP_NUMBER/sub_issues -F sub_issue_id=CHILD_DATABASE_ID
gh api repos/isning/mygo-int/issues/TICKET_NUMBER/dependencies/blocked_by --paginate
gh api --method POST repos/isning/mygo-int/issues/TICKET_NUMBER/dependencies/blocked_by -F issue_id=BLOCKER_DATABASE_ID
gh issue edit TICKET_NUMBER --repo isning/mygo-int --add-assignee isning
```

Issue numbers address endpoints; database IDs are the numeric `id` returned by REST,
not GraphQL node IDs. Create all issues before wiring edges. Inspect relationships
before retrying a mutation. Never encode dependencies only as body checkboxes when
the native API is available.

The frontier is open, unassigned child issues whose native blockers are all closed.
Query the map's `subIssues`, each child's `assignees`, and `blockedBy` through GraphQL,
or enumerate the REST relationships. Paginate all collections and preserve child order.
Use a ticket title as link text; do not narrate bare issue numbers.

Resolutions go in comments, then close the ticket and append one named link/gist to
the map's Decisions so far. Do not add open-ticket lists to the map body. Read the
current map before updating it to preserve concurrent edits. Research assets may
live on local `research/<name>` branches; disclose when a branch has not been pushed.
Do not publish a fabricated remote permalink to a local-only artifact.
