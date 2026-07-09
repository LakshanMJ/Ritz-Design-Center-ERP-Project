import DocumentHead from "@/components/DocumentHead";
import CountryListView from "@/views/settings/country/CountryListView";

const country = () => {
    return (
        <>
            <DocumentHead title='Countries' />
            <CountryListView />
        </>
    );
}

export default country;