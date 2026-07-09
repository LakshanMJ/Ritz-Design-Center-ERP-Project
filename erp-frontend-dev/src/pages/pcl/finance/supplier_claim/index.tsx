import DocumentHead from "@/components/DocumentHead";
import SupplierClaimList from "@/views/pcl_activities/finance/SupplierClaimList";

const SupplierClaim = () => {
    return (
        <>
            <DocumentHead title='Supplier Claim Dashboard' />
            <SupplierClaimList/>
        </>
    );
}

export default SupplierClaim;