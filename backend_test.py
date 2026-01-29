import requests
import sys
import json
from datetime import datetime
import time

class AlluzSolarAPITester:
    def __init__(self, base_url="https://solar-savings-5.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.passed_tests = []

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            self.passed_tests.append(test_name)
            print(f"✅ {test_name} - PASSED")
        else:
            self.failed_tests.append({"test": test_name, "details": details})
            print(f"❌ {test_name} - FAILED: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'
        
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.log_result(name, True)
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                details = f"Expected {expected_status}, got {response.status_code}"
                if response.text:
                    details += f" - Response: {response.text[:200]}"
                self.log_result(name, False, details)
                return False, {}

        except Exception as e:
            self.log_result(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_public_endpoints(self):
        """Test all public endpoints"""
        print("\n" + "="*50)
        print("TESTING PUBLIC ENDPOINTS")
        print("="*50)

        # Test root endpoint
        self.run_test("Root API", "GET", "", 200)

        # Test estados endpoint
        success, estados = self.run_test("Get Estados", "GET", "estados", 200)
        if success and isinstance(estados, list) and len(estados) > 0:
            print(f"   Found {len(estados)} estados")
        
        # Test cidades endpoint with a valid estado
        if success and estados:
            estado = estados[0] if estados else "SP"
            success_cidades, cidades = self.run_test(f"Get Cidades for {estado}", "GET", f"cidades/{estado}", 200)
            if success_cidades and isinstance(cidades, list):
                print(f"   Found {len(cidades)} cidades for {estado}")

        # Test irradiacao endpoint
        self.run_test("Get Irradiacao SP/São Paulo", "GET", "irradiacao/SP/São Paulo", 200)

        # Test configuracao endpoint
        success, config = self.run_test("Get Valor kWp", "GET", "configuracao/valor-kwp", 200)
        if success and isinstance(config, dict) and 'valor_kwp' in config:
            print(f"   Current kWp value: R$ {config['valor_kwp']}")

    def test_lead_creation(self):
        """Test lead creation"""
        print("\n" + "="*50)
        print("TESTING LEAD CREATION")
        print("="*50)

        # Test lead creation with valid data
        lead_data = {
            "nome": "João Silva Teste",
            "telefone": "(11) 99999-9999",
            "email": "joao.teste@email.com",
            "num_residencias": 1,
            "valores_conta": [350.0],
            "estado": "SP",
            "cidade": "São Paulo",
            "tipo_telhado": "colonial",
            "tipo_projeto": "Residencial",
            "kwp": 5.25,
            "valor_projeto": 18375.0,
            "qtd_placas_min": 8,
            "qtd_placas_max": 10,
            "inversor": 5,
            "incidencia_solar": 5.3,
            "payback_anos": 4.2,
            "valorizacao_imovel": 8.0,
            "parcela_estimada": 675.25
        }

        success, response = self.run_test("Create Lead", "POST", "leads", 200, lead_data)
        if success and isinstance(response, dict) and 'lead_id' in response:
            print(f"   Created lead with ID: {response['lead_id']}")
            return response['lead_id']
        
        # Test lead creation with minimal data (missing optional email)
        minimal_lead_data = {
            "nome": "Maria Santos Teste",
            "telefone": "(11) 88888-8888",
            "num_residencias": 2,
            "valores_conta": [250.0, 180.0],
            "estado": "RJ",
            "cidade": "Rio de Janeiro",
            "tipo_telhado": "laje",
            "tipo_projeto": "Comercial",
            "kwp": 8.5,
            "valor_projeto": 29750.0,
            "qtd_placas_min": 12,
            "qtd_placas_max": 16,
            "inversor": 10,
            "incidencia_solar": 5.2,
            "payback_anos": 3.8,
            "valorizacao_imovel": 8.0,
            "parcela_estimada": 1095.83
        }

        success, response = self.run_test("Create Lead (Minimal)", "POST", "leads", 200, minimal_lead_data)
        if success and isinstance(response, dict) and 'lead_id' in response:
            print(f"   Created minimal lead with ID: {response['lead_id']}")

        return None

    def setup_admin_session(self):
        """Setup admin session for testing protected endpoints"""
        print("\n" + "="*50)
        print("SETTING UP ADMIN SESSION")
        print("="*50)

        # This would normally require the auth_testing.md process
        # For now, we'll try to test without auth and see what happens
        print("⚠️  Admin session setup required for protected endpoints")
        print("   Use auth_testing.md playbook to create session")
        return False

    def test_admin_endpoints(self):
        """Test admin endpoints (requires authentication)"""
        print("\n" + "="*50)
        print("TESTING ADMIN ENDPOINTS (AUTH REQUIRED)")
        print("="*50)

        if not self.session_token:
            print("⚠️  No session token available. Skipping admin tests.")
            print("   To test admin endpoints:")
            print("   1. Follow auth_testing.md playbook")
            print("   2. Set session_token in this script")
            return

        # Test admin stats
        self.run_test("Get Admin Stats", "GET", "admin/stats", 200)

        # Test get leads with pagination
        self.run_test("Get Admin Leads", "GET", "admin/leads?page=1&limit=10", 200)

        # Test status types
        self.run_test("Get Status Types", "GET", "admin/status-types", 200)

        # Test tarifas
        self.run_test("Get Tarifas", "GET", "admin/tarifas", 200)

        # Test admin config
        self.run_test("Get Admin Config", "GET", "admin/configuracao", 200)

    def test_error_cases(self):
        """Test error handling"""
        print("\n" + "="*50)
        print("TESTING ERROR CASES")
        print("="*50)

        # Test invalid estado
        self.run_test("Invalid Estado", "GET", "cidades/INVALID", 200)

        # Test invalid irradiacao
        self.run_test("Invalid Irradiacao", "GET", "irradiacao/INVALID/INVALID", 200)

        # Test lead creation with missing required fields
        invalid_lead = {"nome": "Test"}
        self.run_test("Invalid Lead Creation", "POST", "leads", 422, invalid_lead)

        # Test unauthorized admin access
        self.run_test("Unauthorized Admin Access", "GET", "admin/leads", 401)

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")

        if self.failed_tests:
            print(f"\n❌ FAILED TESTS ({len(self.failed_tests)}):")
            for i, failure in enumerate(self.failed_tests, 1):
                print(f"   {i}. {failure['test']}: {failure['details']}")

        if self.passed_tests:
            print(f"\n✅ PASSED TESTS ({len(self.passed_tests)}):")
            for i, test in enumerate(self.passed_tests, 1):
                print(f"   {i}. {test}")

        return len(self.failed_tests) == 0

def main():
    """Main test execution"""
    print("🌞 ALLUZ ENERGIA SOLAR SIMULATOR API TESTS")
    print("=" * 60)
    
    tester = AlluzSolarAPITester()
    
    # Run all test suites
    tester.test_public_endpoints()
    tester.test_lead_creation()
    tester.test_error_cases()
    tester.setup_admin_session()
    tester.test_admin_endpoints()
    
    # Print summary and return exit code
    success = tester.print_summary()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())