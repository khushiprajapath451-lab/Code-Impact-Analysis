"""
Master Orchestration API Router
===============================
Endpoints for triggering the end-to-end SDLC pipeline.
"""

import logging
from fastapi import APIRouter, HTTPException, status, BackgroundTasks, Depends

from app.core.security import verify_api_key
from app.models.pipeline_models import WorkflowExecutionRequest, WorkflowExecutionReport
from app.services.orchestrator import MasterOrchestratorService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/orchestrate", 
    tags=["Master Pipeline"],
    dependencies=[Depends(verify_api_key)]
)
orchestrator = MasterOrchestratorService()


@router.post(
    "/run",
    response_model=WorkflowExecutionReport,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Run the full multi-agent pipeline",
)
async def run_pipeline_endpoint(
    request: WorkflowExecutionRequest,
    background_tasks: BackgroundTasks
) -> WorkflowExecutionReport:
    """
    Executes the End-to-End lifecycle: Impact Analysis -> Code Review -> Test Gaps -> PR Generation.
    Runs asynchronously in the background so it doesn't block the API.
    """
    logger.info("Received request to run master pipeline for req %s", request.requirement_id)
    try:
        # We start the pipeline execution in the background
        execution_id = orchestrator.register_new_execution(request)
        background_tasks.add_task(orchestrator.run_pipeline, request, execution_id)
        
        # Return initial status
        report = orchestrator.get_execution_status(execution_id)
        return report
    except Exception as exc:
        logger.exception("Master Pipeline initialization failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc)
        )


@router.get(
    "/status/{execution_id}",
    response_model=WorkflowExecutionReport,
    status_code=status.HTTP_200_OK,
    summary="Get pipeline execution status",
)
async def get_pipeline_status_endpoint(execution_id: str) -> WorkflowExecutionReport:
    """
    Returns the real-time status and output of a specific pipeline run.
    """
    report = orchestrator.get_execution_status(execution_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Execution ID {execution_id} not found."
        )
    return report
