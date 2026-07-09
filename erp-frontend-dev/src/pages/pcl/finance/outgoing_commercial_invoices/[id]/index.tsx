import { useRouter } from "next/router";
import { Grid } from "@mui/material";
import DocumentHead from "@/components/DocumentHead";
import RitzBreadcrumbs from "@/components/Ritz/RitzBreadcrumbs";
import OutgoingCommercialInvoiceDetails from "@/views/pcl_activities/finance/OutgoingCommercialInvoiceDetails";

const OutgoingCommercialInvoiceDetail = () => {
    const router = useRouter();
    const { id } = router.query;
    const title = 'Outgoing Commercial Invoice Details';

    return (
        <>
            <DocumentHead title={title} />
            <Grid container>
                <Grid item xs={12} md={6}>
                    <RitzBreadcrumbs
                        items={[
                            { label: 'Outgoing Commercial Invoices', url: '/pcl/finance/outgoing_commercial_invoices' },
                            { label: title },
                        ]}
                        title={title}
                    />
                </Grid>
            </Grid>
            <OutgoingCommercialInvoiceDetails outgoingCommercialInvoiceId={id} />

        </>
    );
}

export default OutgoingCommercialInvoiceDetail;