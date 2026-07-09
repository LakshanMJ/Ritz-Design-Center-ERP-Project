import DocumentHead from "@/components/DocumentHead";
import POWiseMaterialSummary from "@/views/finance_warehouse/POWiseMaterialSummary";
import { useRouter } from 'next/router';

const POWiseMaterialSummaryIndex = () => {
    const router = useRouter();
    const { customer, costingId } = router.query;

    return (
        <>
            <DocumentHead title='PO Wise Material Summary' />
            <POWiseMaterialSummary customer={customer} costingId={costingId}/>
        </>
    );
}

export default POWiseMaterialSummaryIndex;