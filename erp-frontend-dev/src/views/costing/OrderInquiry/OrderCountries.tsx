import React, {useEffect, useRef, useState} from "react";
import {useDispatch} from "react-redux";
import { setCostingReducerData } from "@/states/costing/CostingActions";
import RitzCheckBox from "@/components/Ritz/RitzCheckBox";
import {useRouter} from "next/router";
import CostingActionButtons from "@/components/OrderInquiry/Costing/CostingActionButtons";
import DefaultLoader from "@/components/DefaultLoader";
import CostingFormLayout from "@/components/OrderInquiry/Costing/CostingForm";
import CostingCard from "@/components/OrderInquiry/Costing/CostingCard";
import * as yup from "yup";
import RitzFormErrors from "@/components/Ritz/RitzFormErrors";
import { costingOrderSizesURL, costingOrderEditURL } from "@/helpers/constants/FrontEndUrls";
import api from "@/services/api";
import * as restUrls from "@/helpers/constants/RestUrls";
import { toast } from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import { Alert } from "@mui/material";


const OrderCountries = ({ orderId }: any) => {
    const countriesFieldName = 'country';
    const createAPIOrderField = 'order_id';
    const createAPICountriesField = 'country_ids';

    //initial empty error messages
    const countriesEmptyMessage = "Countries options not available. Please contact the system administrator for assistance."

    const router = useRouter();
    const dispatch = useDispatch();

    const [countries, setCountries] = useState<any>([]);
    const [customerBrandIds, setCutomerBrandIds] = useState({ brand: 0, customer: 0 });
    const [orderCountries, setOrderCountries] = useState<any>([]);
    const [countriesErrors, setCountriesErrors] = useState<any>([]);

    const nextPageClicked = useRef(false);
    const previousPageClicked = useRef(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isCountriesEmpty, setIsCountriesEmpty] = useState(false);

    const handleOnChangeCountry = (event: any) => {
        const {value, checked} = event.target;

        if (checked) {
            const newOrderCountries = [...orderCountries, {country: value}];
            setOrderCountries([...newOrderCountries]);
        } else {
            let orderCountriesCopy = [...orderCountries];
            const newOrderCountries = orderCountriesCopy.filter((orderCountry: any, index: any) => {
                return orderCountry.country != value;
            });
            setOrderCountries([...newOrderCountries]);
        }
    }

    useEffect(() => {
        if (countriesErrors.hasErrors) {
            validateCountriesForm();
        }
    }, [orderCountries]);

    const saveCountryData = () => {
        let data = {[createAPIOrderField]: orderId, [createAPICountriesField]: orderCountries.map((country: any) => (country?.country))};

        api.post(restUrls.orderCountryCreateURL(), data).then(resp => {
            if (nextPageClicked.current) {
                router.push(costingOrderSizesURL(orderId));
            } else if (previousPageClicked.current) {
                router.push(costingOrderEditURL(orderId));
            }
        }).catch(error => {
            // TODO ERROR

            // if (VALIDATION_ERROR_CODE === error?.response?.status && error?.response?.data) {
            //     setErrors(error.response.data);
            // }
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsSaving(false);
        });
    }

    const handleNextButton = () => {
        nextPageClicked.current = true;
        validateCountriesForm();
    }

    const handlePreviousButton = () => {
        previousPageClicked.current = true;
        validateCountriesForm();
    }

    const validateCountriesForm = (save?: boolean) => {
        setIsSaving(true);

        const countriesSchema = yup.array().min(1, "Select at least one country");

        let formErrors = {hasErrors: false};

        countriesSchema.validate(orderCountries, {abortEarly: false}).catch((err) => {
            formErrors = err.inner.reduce((acc: any, error: any) => {
                return {
                    [countriesFieldName]: error.errors,
                    hasErrors: true
                }
            }, {});
        }).then(() => {
            if (!formErrors.hasErrors && (nextPageClicked.current || previousPageClicked.current || save)) {
                saveCountryData();
            } else {
                setIsSaving(false);
                nextPageClicked.current = false;
                previousPageClicked.current = false;
                setCountriesErrors({...formErrors});
            }
        });
    }

    const fetchData = () => {
        // Get all data needed for this page and summary component
        const requests = [
            api.get(restUrls.getOrderInquiryDetailsUpdateURL(orderId)),
            api.get(restUrls.orderSizeGroupsURL(orderId)),
            api.get(restUrls.orderCountryListURL(orderId)),
            api.get(restUrls.getGeneralInfoMetaDataURL())
        ]

        Promise.all(requests).then(resp => {
            const respData = resp.map(r => r.data);
            const [orderInquiry, orderSizeGroups, orderCountries, metadata] = respData;
            const { brand, customer } = orderInquiry;
            setCutomerBrandIds({ brand, customer });
            setOrderCountries(orderCountries);
            // setCountries(metadata?.countries);



            // Set in CostingReducer
            dispatch(setCostingReducerData({
                metadata: metadata,
                order_inquiry: {
                    ...orderInquiry,
                    size_groups: orderSizeGroups
                }
            }));

        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    const fetchCountryData = () => {
        const brandId = {
            brand_id : customerBrandIds.brand ? customerBrandIds.brand : null
        }
        const requests = [
            api.post(restUrls.getGeneralInfoCustomerBrandFilteredMetaDataURL(customerBrandIds.customer), brandId)
        ]
        Promise.all(requests).then(resp => {
            const respData = resp.map(r => r.data); 
            const [MetaData] = respData;
            setCountries(MetaData?.countries);
            setIsCountriesEmpty(MetaData?.countries?.length === 0);
        })
    }

    useEffect(() => {
        if (orderId) {
            fetchData();
            if (customerBrandIds.brand > 0 && customerBrandIds.customer > 0) {
                fetchCountryData()
            }
        }
    }, [orderId, customerBrandIds.brand, customerBrandIds.customer]);

    return (
        <>
            {isLoading ? <DefaultLoader /> : (
                <CostingFormLayout step={1} formValues={{countries: orderCountries}}>
                    <CostingCard id="countries-holder">
                        <RitzCheckBox
                            id={'country'}
                            name={'country'}
                            isRequired={true}
                            options={countries}
                            selectedValues={orderCountries}
                            optionValue={'id'}
                            optionText={'name'}
                            labelText={"Select Order Countries:"}
                            row={true}
                            selectedOptionValue={'country'}
                            handleOnChange={handleOnChangeCountry}></RitzCheckBox>
                        {isCountriesEmpty && <Alert severity="error">{countriesEmptyMessage}</Alert>}
                        <RitzFormErrors errorList={countriesErrors?.[countriesFieldName]}/>
                    </CostingCard>

                    <CostingActionButtons
                        showNext={true}
                        showPrevious={true}
                        nextButtonOnClickAction={handleNextButton}
                        previousButtonOnClickAction={handlePreviousButton}
                        showSave={true}
                        saveButtonOnClickAction={() => validateCountriesForm(true)}
                        errors={countriesErrors}
                        saving={isSaving}
                    />
                </CostingFormLayout>
            )}
        </>
    )
};

export default OrderCountries;