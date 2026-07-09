import CostingList from "@/views/costings/CostingList";
import DocumentHead from "@/components/DocumentHead";


const CostingsListPage = () => {
    return (
        <>
            <DocumentHead title='Costings' />
            <CostingList/>
        </>
    );
}

export default CostingsListPage;