"""
MassMutual End-to-End Pipeline Demonstration
============================================
Simulates the execution of the full SDLC loop for a financial engineering team.
"""

import asyncio
import json
import logging
import os
import time

from app.models.pipeline_models import RunMode, WorkflowExecutionRequest
from app.services.orchestrator import MasterOrchestratorService

# Configure logging for demo output
logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("Demo")

def print_banner(text: str):
    print("\n" + "="*80)
    print(f" {text}")
    print("="*80 + "\n")

async def run_demo():
    print_banner("MASS-MUTUAL AI CODE ASSISTANT | PHASE 8 DEMONSTRATION")
    
    # 1. Setup Mock Data
    req_id = "MM-SEC-409"
    req_title = "Implement OTP-Based Authentication for Policyholder Login"
    req_description = (
        "As a security engineer, I need to ensure that when a policyholder logs into "
        "their dashboard, they must provide a One-Time Password (OTP) sent via SMS. "
        "This mitigates account takeover risks. Target components: AuthService.java and SMSNotification.java."
    )
    
    mock_diff = """\
diff --git a/src/main/AuthService.java b/src/main/AuthService.java
--- a/src/main/AuthService.java
+++ b/src/main/AuthService.java
@@ -10,6 +10,10 @@
     public boolean login(String username, String password) {
         if (verifyCredentials(username, password)) {
+            // Trigger OTP
+            smsNotification.sendOTP(username);
+            return true; // Wait for OTP verification
-            return true;
         }
         return false;
     }
"""
    
    # 2. Instantiate Orchestrator
    orchestrator = MasterOrchestratorService()
    
    request = WorkflowExecutionRequest(
        requirement_id=req_id,
        requirement_title=req_title,
        requirement_description=req_description,
        repository_id="mass-mutual/policy-portal",
        pull_request_id="PR-1024",
        diff_content=mock_diff,
        changed_files=["src/main/AuthService.java"],
        run_mode=RunMode.FULL
    )

    print("Triggering End-to-End Master Pipeline...\n")
    start_time = time.time()
    
    # Execute Pipeline
    report = orchestrator.run_pipeline(request)
    
    print_banner("PIPELINE EXECUTION COMPLETE")
    print(f"Execution ID: {report.execution_id}")
    print(f"Total Time:   {report.metrics.total_execution_ms / 1000.0:.2f} seconds")
    print(f"Overall Risk: {report.overall_risk_score}\n")
    
    if report.error_message:
        print(f"ERROR: {report.error_message}")
        return

    # STEP 1: Impact Analysis
    print_banner("STEP 1: IMPACT ANALYSIS (PHASE 4)")
    if report.impact_analysis:
        print(f"Risk Level: {report.impact_analysis.overall_risk_level.value}")
        print("Impacted Components:")
        for c in report.impact_analysis.impacted_components:
            print(f"  - {c.component_name} (Risk: {c.risk_level.value})")
    
    # STEP 2: Code Review
    print_banner("STEP 2: AUTOMATED CODE REVIEW (PHASE 6)")
    if report.code_review:
        print(f"Status: {report.code_review.overall_status.value}")
        for issue in report.code_review.comments:
            print(f"  [{issue.severity.value}] {issue.file_path}: {issue.issue_description}")
            
    # STEP 3: Test Recommendations
    print_banner("STEP 3: TEST RECOMMENDATIONS (PHASE 7)")
    if report.test_recommendations:
        print(f"Missing Tests: {report.test_recommendations.total_missing_tests}")
        for t in report.test_recommendations.test_suggestions:
            print(f"  - {t.test_case_name} ({t.test_type.value}) -> Expected: {t.expected_behavior}")

    # STEP 4: PR Draft
    print_banner("STEP 4: PULL REQUEST DRAFT (PHASE 7)")
    if report.generated_pr_draft:
        print(f"Title: {report.generated_pr_draft.pr_title}\n")
        print(f"Summary: {report.generated_pr_draft.summary}\n")
        print(f"Breaking Changes: {report.generated_pr_draft.breaking_changes_flag}\n")
        print(f"Security Notes: {report.generated_pr_draft.security_and_compliance_notes}\n")
        print("Reviewers:", ", ".join(report.generated_pr_draft.recommended_reviewers_tags))
    
    print("\nEnd-to-End Demonstration Successfully Concluded.")

if __name__ == "__main__":
    # Disable loud HTTP loggers for clean demo output
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("app.core.audit_logger").setLevel(logging.INFO)
    asyncio.run(run_demo())
