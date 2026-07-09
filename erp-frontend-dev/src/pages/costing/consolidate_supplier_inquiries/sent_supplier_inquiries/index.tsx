import DocumentHead from '@/components/DocumentHead';
import SentSupplierInquiryList from '@/views/costing/ConsolidateSupplierInquiry/SentSupplierInquiryList';
const CostingMaterials = () => {
    return ( 
        <>
            <DocumentHead title='Costing Materials' />
            <SentSupplierInquiryList/>
        </>
     );
}

export default CostingMaterials;