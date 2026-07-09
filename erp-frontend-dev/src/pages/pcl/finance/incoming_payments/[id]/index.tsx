import OrderSummary from "@/views/costing/OrderSummary";
import { useRouter } from "next/router";
import { Grid } from "@mui/material";
import DocumentHead from "@/components/DocumentHead";
import RitzBreadcrumbs from "@/components/Ritz/RitzBreadcrumbs";
import IncomingPaymentDetails from "@/views/pcl_activities/finance/IncomingPaymentDetails";

const IncomingPaymentDetail = () => {
    const router = useRouter();
    const { id } = router.query;
    const title = 'Incoming Payment Details';

    return (
        <>
            <DocumentHead title={title} />
            <Grid container>
                <Grid item xs={12} md={6}>
                    <RitzBreadcrumbs
                        items={[
                            { label: 'Incoming Payments', url: '/pcl/finance/incoming_payments' },
                            { label: title },
                        ]}
                        title={title}
                    />
                </Grid>
            </Grid>
            <IncomingPaymentDetails incomingPaymentId={id} />

        </>
    );
}

export default IncomingPaymentDetail;