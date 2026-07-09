import DocumentHead from '@/components/DocumentHead';
import RitzBreadcrumbs from '@/components/Ritz/RitzBreadcrumbs';
import CostingMaterialList from '@/views/costing/ConsolidateSupplierInquiry/CostingMaterialList';
const CostingMaterials = () => {
    return ( 
        <>
            <DocumentHead title='Costing Materials' />
            <CostingMaterialList />
        </>
     );
}

export default CostingMaterials;