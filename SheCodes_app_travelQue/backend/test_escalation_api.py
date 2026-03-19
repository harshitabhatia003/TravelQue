#!/usr/bin/env python3
"""
Comprehensive test suite for the Escalation Management System
Tests all endpoints and workflows
"""

import httpx
import json
import asyncio
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

class EscalationAPITester:
    def __init__(self):
        self.escalation_id = None
        self.booking_item_id = None
        self.ops_user_id = "ops-001"
        
    async def test_all(self):
        """Run all tests in sequence"""
        print("\n" + "="*80)
        print("ESCALATION MANAGEMENT SYSTEM - API TEST SUITE")
        print("="*80 + "\n")
        
        try:
            await self.test_1_simulate_failure()
            await self.test_2_list_escalations()
            await self.test_3_get_escalation_details()
            await self.test_4_claim_escalation()
            await self.test_5_search_alternatives()
            await self.test_6_resolve_escalation()
            await self.test_7_list_resolved()
            
            print("\n" + "="*80)
            print("✅ ALL TESTS COMPLETED SUCCESSFULLY")
            print("="*80 + "\n")
            
        except Exception as e:
            print(f"\n❌ TEST FAILED: {e}\n")
            import traceback
            traceback.print_exc()
    
    async def test_1_simulate_failure(self):
        """Test 1: Simulate booking failure"""
        print("\n" + "-"*80)
        print("TEST 1: Simulate Booking Failure")
        print("-"*80)
        
        async with httpx.AsyncClient() as client:
            params = {
                "journey_id": "journey-001",
                "booking_type": "hotel",
                "customer_city": "London",
                "customer_name": "John Doe",
                "customer_email": "john@example.com",
                "budget": 5000,
                "currency": "USD",
                "departure_date": (datetime.now() + timedelta(days=5)).isoformat()
            }
            
            response = await client.post(
                f"{BASE_URL}/api/test/simulate-booking-failure",
                params=params
            )
            
            print(f"Status: {response.status_code}")
            data = response.json()
            self.escalation_id = data.get("escalation_id")
            self.booking_item_id = data.get("booking_item_id")
            
            print(f"Response:")
            print(json.dumps(data, indent=2, default=str))
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            assert self.escalation_id, "No escalation_id in response"
            print("\n✅ Test 1 PASSED")
    
    async def test_2_list_escalations(self):
        """Test 2: List escalations"""
        print("\n" + "-"*80)
        print("TEST 2: List Escalations")
        print("-"*80)
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{BASE_URL}/api/ops/escalations",
                params={"status": "open"}
            )
            
            print(f"Status: {response.status_code}")
            data = response.json()
            
            print(f"Response:")
            print(json.dumps(data, indent=2, default=str))
            
            assert response.status_code == 200
            assert data["total"] > 0, "No escalations found"
            print(f"\n✅ Test 2 PASSED - Found {data['total']} escalations")
    
    async def test_3_get_escalation_details(self):
        """Test 3: Get escalation details"""
        print("\n" + "-"*80)
        print("TEST 3: Get Escalation Details")
        print("-"*80)
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{BASE_URL}/api/ops/escalations/{self.escalation_id}"
            )
            
            print(f"Status: {response.status_code}")
            data = response.json()
            
            print(f"Response:")
            print(json.dumps(data, indent=2, default=str))
            
            assert response.status_code == 200
            assert data["id"] == self.escalation_id
            print(f"\n✅ Test 3 PASSED")
            print(f"   - Priority: {data['priority']}")
            print(f"   - Status: {data['status']}")
            print(f"   - Customer: {data['customer_name']}")
    
    async def test_4_claim_escalation(self):
        """Test 4: Claim escalation"""
        print("\n" + "-"*80)
        print("TEST 4: Claim Escalation")
        print("-"*80)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BASE_URL}/api/ops/escalations/{self.escalation_id}/claim",
                params={"ops_user_id": self.ops_user_id}
            )
            
            print(f"Status: {response.status_code}")
            data = response.json()
            
            print(f"Response:")
            print(json.dumps(data, indent=2, default=str))
            
            assert response.status_code == 200
            assert data["claimed_by_ops_id"] == self.ops_user_id
            print(f"\n✅ Test 4 PASSED - Claimed by {self.ops_user_id}")
    
    async def test_5_search_alternatives(self):
        """Test 5: Search alternatives"""
        print("\n" + "-"*80)
        print("TEST 5: Search Alternatives with AI Ranking")
        print("-"*80)
        
        async with httpx.AsyncClient() as client:
            payload = {
                "max_results": 5,
                "max_price_variance": 0.30
            }
            
            response = await client.post(
                f"{BASE_URL}/api/ops/escalations/{self.escalation_id}/search-alternatives",
                json=payload
            )
            
            print(f"Status: {response.status_code}")
            data = response.json()
            
            print(f"Response:")
            print(json.dumps(data, indent=2, default=str))
            
            assert response.status_code == 200
            assert "alternatives" in data
            
            alternatives = data["alternatives"]
            print(f"\n✅ Test 5 PASSED - Found {len(alternatives)} alternatives")
            
            for i, alt in enumerate(alternatives, 1):
                print(f"\n   Alternative {i}:")
                print(f"      Name: {alt.get('name')}")
                print(f"      Provider: {alt.get('provider')}")
                print(f"      Price: ${alt.get('price')}")
                print(f"      Match Score: {alt.get('match_score')}/100")
                print(f"      Recommendation: {alt.get('recommendation_level')}")
    
    async def test_6_resolve_escalation(self):
        """Test 6: Resolve escalation with selected alternative"""
        print("\n" + "-"*80)
        print("TEST 6: Resolve Escalation with Selected Alternative")
        print("-"*80)
        
        # First get the alternatives again to select one
        async with httpx.AsyncClient() as client:
            # Get alternatives
            response = await client.post(
                f"{BASE_URL}/api/ops/escalations/{self.escalation_id}/search-alternatives",
                json={"max_results": 3, "max_price_variance": 0.30}
            )
            alternatives = response.json()["alternatives"]
            
            if alternatives:
                selected = alternatives[0]  # Select best ranked
                
                # Resolve
                payload = {
                    "selected_alternative": selected,
                    "resolution_notes": "Booked premium option with better amenities"
                }
                
                response = await client.post(
                    f"{BASE_URL}/api/ops/escalations/{self.escalation_id}/resolve",
                    json=payload,
                    params={"ops_user_id": self.ops_user_id}
                )
                
                print(f"Status: {response.status_code}")
                data = response.json()
                
                print(f"Response:")
                print(json.dumps(data, indent=2, default=str))
                
                assert response.status_code == 200
                assert data["status"] == "resolved"
                print(f"\n✅ Test 6 PASSED")
                print(f"   - Resolved with: {selected['name']}")
                print(f"   - Match Score: {selected['match_score']}/100")
    
    async def test_7_list_resolved(self):
        """Test 7: List resolved escalations"""
        print("\n" + "-"*80)
        print("TEST 7: List Resolved Escalations")
        print("-"*80)
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{BASE_URL}/api/ops/escalations",
                params={"status": "resolved"}
            )
            
            print(f"Status: {response.status_code}")
            data = response.json()
            
            print(f"Response:")
            print(json.dumps(data, indent=2, default=str))
            
            assert response.status_code == 200
            print(f"\n✅ Test 7 PASSED - Found {data['total']} resolved escalations")


if __name__ == "__main__":
    tester = EscalationAPITester()
    asyncio.run(tester.test_all())
