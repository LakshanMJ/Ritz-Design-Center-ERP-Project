import { useRouter } from "next/router";
import { Grid } from "@mui/material";
import DocumentHead from "@/components/DocumentHead";
import RitzBreadcrumbs from "@/components/Ritz/RitzBreadcrumbs";
import PCLFacilityDetails from "@/views/pcl_activities/pcl_facility/PCLFacilityDetails";

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
                            { label: 'PCL Facility DashBoard', url: '/pcl/finance/pcl_facility' },
                            { label: title },
                        ]}
                        title={title}
                    />
                </Grid>
            </Grid>
            <PCLFacilityDetails pclDetailId={id} />

        </>
    );
}

export default PCLSummaryDetails;