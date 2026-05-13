import { Router } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import sectorsRouter from "./sectors";
import cyclesRouter from "./cycles";
import allocationsRouter from "./allocations";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import productsRouter from "./products";
import purchaseOrdersRouter from "./purchase-orders";
import sectorControlsRouter from "./sector-controls";
import approvalLimitsRouter from "./approval-limits";
import supabaseRouter from "./supabase";
import notificationsRouter from "./notifications";
import auditRouter from "./audit";
import publicRouter from "./public";
import seedRouter from "./seed";

const router = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(sectorsRouter);
router.use(cyclesRouter);
router.use(allocationsRouter);
router.use(dashboardRouter);
router.use(reportsRouter);
router.use(productsRouter);
router.use(purchaseOrdersRouter);
router.use(sectorControlsRouter);
router.use(approvalLimitsRouter);
router.use(supabaseRouter);
router.use(notificationsRouter);
router.use(auditRouter);
router.use(publicRouter);
router.use(seedRouter);

export default router;

