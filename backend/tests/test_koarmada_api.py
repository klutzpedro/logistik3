"""
Koarmada 3 API Tests
Tests for: Auth, Assets CRUD, Dashboard Stats, AI Analysis, Role-based access
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from seed data
ADMIN_CREDS = {"email": "admin@koarmada3.tnial.mil.id", "password": "admin123"}
OPERATOR_CREDS = {"email": "operator@koarmada3.tnial.mil.id", "password": "operator123"}
VIEWER_CREDS = {"email": "viewer@koarmada3.tnial.mil.id", "password": "viewer123"}


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def operator_token(api_client):
    """Get operator authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=OPERATOR_CREDS)
    assert response.status_code == 200, f"Operator login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def viewer_token(api_client):
    """Get viewer authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=VIEWER_CREDS)
    assert response.status_code == 200, f"Viewer login failed: {response.text}"
    return response.json()["access_token"]


class TestHealthAndRoot:
    """Basic API health checks"""
    
    def test_api_root(self, api_client):
        """Test API root endpoint"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "operational"
        assert "Koarmada 3" in data["message"]


class TestAuth:
    """Authentication endpoint tests"""
    
    def test_login_admin_success(self, api_client):
        """Test admin login with valid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == ADMIN_CREDS["email"]
        assert data["user"]["role"] == "admin"
        assert "id" in data["user"]
        assert "name" in data["user"]
    
    def test_login_operator_success(self, api_client):
        """Test operator login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=OPERATOR_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "operator"
    
    def test_login_viewer_success(self, api_client):
        """Test viewer login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=VIEWER_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "viewer"
    
    def test_login_invalid_credentials(self, api_client):
        """Test login with wrong password"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@koarmada3.tnial.mil.id",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
    
    def test_login_nonexistent_user(self, api_client):
        """Test login with non-existent email"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "test123"
        })
        assert response.status_code == 401
    
    def test_get_me_authenticated(self, api_client, admin_token):
        """Test GET /auth/me with valid token"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_CREDS["email"]
        assert data["role"] == "admin"
    
    def test_get_me_unauthenticated(self, api_client):
        """Test GET /auth/me without token"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code in [401, 403]
    
    def test_register_new_user(self, api_client):
        """Test user registration"""
        import uuid
        unique_email = f"TEST_user_{uuid.uuid4().hex[:8]}@test.com"
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Test User",
            "role": "viewer"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == unique_email
        assert data["user"]["role"] == "viewer"
    
    def test_register_duplicate_email(self, api_client):
        """Test registration with existing email"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": ADMIN_CREDS["email"],
            "password": "test123",
            "name": "Duplicate User"
        })
        assert response.status_code == 400


class TestAssets:
    """Asset CRUD tests"""
    
    def test_list_all_assets(self, api_client, admin_token):
        """Test GET /assets - list all assets"""
        response = api_client.get(
            f"{BASE_URL}/api/assets",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 7  # 5 kapal + 2 pangkalan from seed
    
    def test_list_assets_filter_kapal(self, api_client, admin_token):
        """Test GET /assets?type=kapal - filter by type"""
        response = api_client.get(
            f"{BASE_URL}/api/assets?type=kapal",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 5
        for asset in data:
            assert asset["type"] == "kapal"
    
    def test_list_assets_filter_pangkalan(self, api_client, admin_token):
        """Test GET /assets?type=pangkalan - filter by type"""
        response = api_client.get(
            f"{BASE_URL}/api/assets?type=pangkalan",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2
        for asset in data:
            assert asset["type"] == "pangkalan"
    
    def test_get_asset_detail(self, api_client, admin_token):
        """Test GET /assets/{id} - get asset detail with all fields"""
        # First get list to find an asset ID
        list_response = api_client.get(
            f"{BASE_URL}/api/assets?type=kapal",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assets = list_response.json()
        asset_id = assets[0]["id"]
        
        # Get detail
        response = api_client.get(
            f"{BASE_URL}/api/assets/{asset_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required fields
        assert "id" in data
        assert "name" in data
        assert "code" in data
        assert "type" in data
        assert "konis_status" in data
        assert "readiness_percentage" in data
        assert "logistics" in data
        assert "weapon_systems" in data
        assert "images" in data
        assert "personnel" in data
        
        # Verify logistics structure
        logistics = data["logistics"]
        assert "bahan_bakar" in logistics
        assert "air_bersih" in logistics
        assert "amunisi" in logistics
    
    def test_get_asset_not_found(self, api_client, admin_token):
        """Test GET /assets/{id} with non-existent ID"""
        response = api_client.get(
            f"{BASE_URL}/api/assets/nonexistent-id-12345",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404
    
    def test_verify_seed_data_kapal(self, api_client, admin_token):
        """Verify seeded kapal data: KRI Diponegoro 365, KRI Sultan Hasanuddin 366, etc."""
        response = api_client.get(
            f"{BASE_URL}/api/assets?type=kapal",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        codes = [a["code"] for a in data]
        names = [a["name"] for a in data]
        
        # Verify expected ships
        assert "365" in codes, "KRI Diponegoro 365 not found"
        assert "366" in codes, "KRI Sultan Hasanuddin 366 not found"
        assert "357" in codes, "KRI Bung Tomo 357 not found"
        assert "402" in codes, "KRI Nanggala 402 not found"
        assert "593" in codes, "KRI Banda Aceh 593 not found"
    
    def test_verify_seed_data_pangkalan(self, api_client, admin_token):
        """Verify seeded pangkalan data: LTM-XIV, FSH-MKW"""
        response = api_client.get(
            f"{BASE_URL}/api/assets?type=pangkalan",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        codes = [a["code"] for a in data]
        
        assert "LTM-XIV" in codes, "Lantamal XIV not found"
        assert "FSH-MKW" in codes, "Fasharkan Manokwari not found"


class TestAssetCRUD:
    """Asset Create, Update, Delete tests with role-based access"""
    
    def test_create_asset_admin(self, api_client, admin_token):
        """Test POST /assets - admin can create"""
        payload = {
            "type": "kapal",
            "name": "TEST_KRI Test Ship",
            "code": "TEST-001",
            "description": "Test ship for automated testing",
            "konis_status": "siap",
            "readiness_percentage": 85,
            "location": "Test Location",
            "logistics": {
                "bahan_bakar": 80,
                "air_bersih": 75,
                "fresh_room": 70,
                "minyak_lincir": 65,
                "amunisi": 90,
                "ransum": 85
            },
            "weapon_systems": [
                {"name": "Test Gun", "type": "Main Gun", "status": "siap", "notes": "Test"}
            ]
        }
        response = api_client.post(
            f"{BASE_URL}/api/assets",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == payload["name"]
        assert data["code"] == payload["code"]
        assert "id" in data
        
        # Verify persistence with GET
        get_response = api_client.get(
            f"{BASE_URL}/api/assets/{data['id']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["name"] == payload["name"]
    
    def test_create_asset_operator(self, api_client, operator_token):
        """Test POST /assets - operator can create"""
        payload = {
            "type": "pangkalan",
            "name": "TEST_Pangkalan Operator",
            "code": "TEST-OP-001",
            "konis_status": "siap_terbatas",
            "readiness_percentage": 70
        }
        response = api_client.post(
            f"{BASE_URL}/api/assets",
            json=payload,
            headers={"Authorization": f"Bearer {operator_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == payload["name"]
    
    def test_create_asset_viewer_forbidden(self, api_client, viewer_token):
        """Test POST /assets - viewer should get 403"""
        payload = {
            "type": "kapal",
            "name": "TEST_Viewer Ship",
            "code": "TEST-V-001",
            "konis_status": "siap"
        }
        response = api_client.post(
            f"{BASE_URL}/api/assets",
            json=payload,
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert response.status_code == 403
    
    def test_update_asset_admin(self, api_client, admin_token):
        """Test PUT /assets/{id} - admin can update"""
        # First create an asset
        create_response = api_client.post(
            f"{BASE_URL}/api/assets",
            json={
                "type": "kapal",
                "name": "TEST_Update Ship",
                "code": "TEST-UPD-001",
                "konis_status": "siap",
                "readiness_percentage": 80
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        asset_id = create_response.json()["id"]
        
        # Update
        update_payload = {
            "type": "kapal",
            "name": "TEST_Updated Ship Name",
            "code": "TEST-UPD-001",
            "konis_status": "siap_terbatas",
            "readiness_percentage": 65
        }
        response = api_client.put(
            f"{BASE_URL}/api/assets/{asset_id}",
            json=update_payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Updated Ship Name"
        assert data["konis_status"] == "siap_terbatas"
        
        # Verify persistence
        get_response = api_client.get(
            f"{BASE_URL}/api/assets/{asset_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.json()["name"] == "TEST_Updated Ship Name"
    
    def test_update_asset_viewer_forbidden(self, api_client, admin_token, viewer_token):
        """Test PUT /assets/{id} - viewer should get 403"""
        # Get an existing asset
        list_response = api_client.get(
            f"{BASE_URL}/api/assets",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        asset = list_response.json()[0]
        
        response = api_client.put(
            f"{BASE_URL}/api/assets/{asset['id']}",
            json={**asset, "name": "Viewer Update Attempt"},
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert response.status_code == 403
    
    def test_delete_asset_admin(self, api_client, admin_token):
        """Test DELETE /assets/{id} - admin can delete"""
        # Create asset to delete
        create_response = api_client.post(
            f"{BASE_URL}/api/assets",
            json={
                "type": "kapal",
                "name": "TEST_Delete Ship",
                "code": "TEST-DEL-001",
                "konis_status": "tidak_siap"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        asset_id = create_response.json()["id"]
        
        # Delete
        response = api_client.delete(
            f"{BASE_URL}/api/assets/{asset_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        # Verify deletion
        get_response = api_client.get(
            f"{BASE_URL}/api/assets/{asset_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 404
    
    def test_delete_asset_operator_forbidden(self, api_client, admin_token, operator_token):
        """Test DELETE /assets/{id} - operator should get 403"""
        # Create asset
        create_response = api_client.post(
            f"{BASE_URL}/api/assets",
            json={
                "type": "kapal",
                "name": "TEST_Operator Delete Attempt",
                "code": "TEST-ODA-001",
                "konis_status": "siap"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        asset_id = create_response.json()["id"]
        
        # Operator tries to delete
        response = api_client.delete(
            f"{BASE_URL}/api/assets/{asset_id}",
            headers={"Authorization": f"Bearer {operator_token}"}
        )
        assert response.status_code == 403
    
    def test_delete_asset_viewer_forbidden(self, api_client, admin_token, viewer_token):
        """Test DELETE /assets/{id} - viewer should get 403"""
        list_response = api_client.get(
            f"{BASE_URL}/api/assets",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        asset_id = list_response.json()[0]["id"]
        
        response = api_client.delete(
            f"{BASE_URL}/api/assets/{asset_id}",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert response.status_code == 403


class TestDashboard:
    """Dashboard stats endpoint tests"""
    
    def test_dashboard_stats(self, api_client, admin_token):
        """Test GET /dashboard/stats - returns all required fields"""
        response = api_client.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert "total_kapal" in data
        assert "total_pangkalan" in data
        assert "status_count" in data
        assert "avg_readiness" in data
        assert "logistics_avg" in data
        assert "readiness_list" in data
        
        # Verify status_count structure
        status_count = data["status_count"]
        assert "siap" in status_count
        assert "siap_terbatas" in status_count
        assert "tidak_siap" in status_count
        
        # Verify data types
        assert isinstance(data["total_kapal"], int)
        assert isinstance(data["total_pangkalan"], int)
        assert isinstance(data["avg_readiness"], (int, float))
        assert isinstance(data["readiness_list"], list)
        
        # Verify readiness_list structure
        if data["readiness_list"]:
            item = data["readiness_list"][0]
            assert "name" in item
            assert "code" in item
            assert "readiness" in item
            assert "status" in item
            assert "type" in item
    
    def test_dashboard_stats_unauthenticated(self, api_client):
        """Test GET /dashboard/stats without auth"""
        response = api_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code in [401, 403]


class TestAIAnalysis:
    """AI Analysis endpoint tests"""
    
    def test_ai_analysis_success(self, api_client, admin_token):
        """Test POST /ai-analysis - successful analysis"""
        # Get an asset ID
        list_response = api_client.get(
            f"{BASE_URL}/api/assets?type=kapal",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        asset_id = list_response.json()[0]["id"]
        
        response = api_client.post(
            f"{BASE_URL}/api/ai-analysis",
            json={"asset_id": asset_id},
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=60  # AI can take time
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "asset_id" in data
        assert "analysis" in data
        assert "timestamp" in data
        assert data["asset_id"] == asset_id
        assert len(data["analysis"]) > 50  # Should have substantial content
    
    def test_ai_analysis_with_question(self, api_client, admin_token):
        """Test POST /ai-analysis with custom question"""
        list_response = api_client.get(
            f"{BASE_URL}/api/assets?type=kapal",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        asset_id = list_response.json()[0]["id"]
        
        response = api_client.post(
            f"{BASE_URL}/api/ai-analysis",
            json={
                "asset_id": asset_id,
                "question": "Apakah aset siap untuk operasi patroli 30 hari?"
            },
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["analysis"]) > 50
    
    def test_ai_analysis_invalid_asset(self, api_client, admin_token):
        """Test POST /ai-analysis with non-existent asset"""
        response = api_client.post(
            f"{BASE_URL}/api/ai-analysis",
            json={"asset_id": "nonexistent-asset-id"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404
    
    def test_ai_analysis_unauthenticated(self, api_client):
        """Test POST /ai-analysis without auth"""
        response = api_client.post(
            f"{BASE_URL}/api/ai-analysis",
            json={"asset_id": "some-id"}
        )
        assert response.status_code in [401, 403]


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_assets(self, api_client, admin_token):
        """Delete all TEST_ prefixed assets"""
        response = api_client.get(
            f"{BASE_URL}/api/assets",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assets = response.json()
        
        deleted = 0
        for asset in assets:
            if asset["name"].startswith("TEST_") or asset["code"].startswith("TEST"):
                del_response = api_client.delete(
                    f"{BASE_URL}/api/assets/{asset['id']}",
                    headers={"Authorization": f"Bearer {admin_token}"}
                )
                if del_response.status_code == 200:
                    deleted += 1
        
        print(f"Cleaned up {deleted} test assets")
        assert True  # Always pass cleanup
