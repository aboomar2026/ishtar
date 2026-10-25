# SQL reference

The owner-run database scripts, execution-status ledger and database move/restore checklist are indexed in [docs/database/README.md](../../docs/database/README.md).

Schema additions remain in [prisma/additive](../../prisma/additive); data scripts and standalone repairs remain here. Do not run this directory as a batch. Product/collection fixtures are optional test data, not required production migrations. No SQL runs during the Netlify build.
