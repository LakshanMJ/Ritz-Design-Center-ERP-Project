import { useRouter } from "next/router";
import { Grid } from "@mui/material";
import DocumentHead from "@/components/DocumentHead";
import RitzBreadcrumbs from "@/components/Ritz/RitzBreadcrumbs";
import CreateOutgoingPayment from "@/views/pcl_activities/finance/CreateOutgoingPayment";
import OutgoingPaymentDetails from "@/views/pcl_activities/finance/OutgoingPaymentDetails";

const OutgoingPaymentDetail = () => {
    const router = useRouter();
    const { id } = router.query;
    const title = 'Outgoing Payment Details';

    return (
        <>
            <DocumentHead title={title} />
            <Grid container>
                <Grid item xs={12} md={6}>
                    <RitzBreadcrumbs
                        items={[
                            { label: 'Outgoing Payments', url: '/pcl/finance/outgoing_payments' },
                            { label: title },
                        ]}
                        title={title}
                    />
                </Grid>
            </Grid>
            <OutgoingPaymentDetails outgoingPaymentId={id}/>

        </>
    );
}

export default OutgoingPaymentDetail;