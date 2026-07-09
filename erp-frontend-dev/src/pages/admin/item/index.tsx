import DocumentHead from '@/components/DocumentHead';
import ItemListView from '@/views/settings/item/ItemListView';

const item = () => {
    return (
        <>
            <DocumentHead title='Items' />
            <ItemListView />
        </>
    );
};

export default item;