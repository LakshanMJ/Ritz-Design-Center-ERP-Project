import DocumentHead from '@/components/DocumentHead';
import WarehouseListView from '@/views/settings/warehouse/WarehouseListView';

const warehouse = () => {
    return (
        <>
            <DocumentHead title='WareHouse'/>
            <WarehouseListView/>
        </>
    );
};

export default warehouse;