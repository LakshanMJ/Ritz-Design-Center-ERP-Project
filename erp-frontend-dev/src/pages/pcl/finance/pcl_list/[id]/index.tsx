import OrderSummary from "@/views/costing/OrderSummary";
import { useRouter } from "next/router";
import { Grid } from "@mui/material";
import DocumentHead from "@/components/DocumentHead";
import RitzBreadcrumbs from "@/components/Ritz/RitzBreadcrumbs";
import OutgoingCommercialInvoiceDetails from "@/views/pcl_activities/finance/OutgoingCommercialInvoiceDetails";
import PCLSummary from "@/views/pcl_activities/finance/PCLSummary";

const PCLSummaryDetails = () => {
    const router = useRouter();
    const { id } = router.query;
    const title = 'PCL Facility Details';

    return (
        <>
            <DocumentHead title={title} />
            <Grid container>
                <Grid item xs={12} md={6}>
                    <RitzBreadcrumbs
                        items={[
                            { label: 'PCL List', url: '/pcl/finance/pcl_list' },
                            { label: title },
                        ]}
                        title={title}
                    />
                </Grid>
            </Grid>
            <PCLSummary pclDetailId={id} />

        </>
    );
}

export default PCLSummaryDetails;