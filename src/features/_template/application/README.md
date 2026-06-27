# Application Layer

Owns use cases, service orchestration, validation coordination, ports, authorization calls, transaction boundaries, and audit requests.

Application code receives dependencies through ports and must not instantiate Supabase clients directly.
