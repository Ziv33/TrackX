import pytest
from supabase import create_client

@pytest.fixture(scope="session")
def supabase_client():
    url = "http://localhost:54321"
    key = "your-local-anon-key"
    return create_client(url, key)