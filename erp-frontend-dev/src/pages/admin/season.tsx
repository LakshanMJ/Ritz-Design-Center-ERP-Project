import DocumentHead from "@/components/DocumentHead";
import SeasonListPage from "@/views/settings/season/SeasonListView";

const season = () => {
    return (
        <>
            <DocumentHead title='Seasons' />
            <SeasonListPage />
        </>
    );
}

export default season;