import DocumentHead from '@/components/DocumentHead';
import OtherCostList from '@/views/settings/other_cost_types/OtherCostList';

const OtherCostTypes = () => {
    return (
        <>
            <DocumentHead title='Other Costs' />
            <OtherCostList/>
        </>
    );
};

export default OtherCostTypes;