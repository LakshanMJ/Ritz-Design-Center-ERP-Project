import React, {useEffect, useRef} from "react";
import RitzRadio from "@/components/Ritz/RitzRadio";
import RitzInput from "@/components/Ritz/RitzInput";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { setCostingReducerData } from "@/states/costing/CostingActions";
import { useRouter } from "next/router";
import DefaultLoader from "@/components/DefaultLoader";
import CostingFormLayout from "../../components/OrderInquiry/Costing/CostingForm";
import CostingActionButtons from "@/components/OrderInquiry/Costing/CostingActionButtons";
import CostingCard from "@/components/OrderInquiry/Costing/CostingCard";
import RitzFormErrors from "@/components/Ritz/RitzFormErrors";
import * as yup from "yup";
import api from "@/services/api";
import * as restUrls from "@/helpers/constants/RestUrls";
import { costingOrderEditURL, orderCountriesAddURL } from "@/helpers/constants/FrontEndUrls";
import { toast } from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import { Alert, Typography } from "@mui/material";


const OrderInquiryGeneralInfoForm = ({ orderId }: any) => {
    const customerFieldName = 'customer';
    const brandFieldName = 'brand';
    const seasonFieldName = 'season';
    const deparmentFieldName = 'department';
    const descriptionFieldName = 'style_description';
    const yearFieldName = 'year';
    const styleNumberPerPackFieldName = 'style_number';
    const idFieldName = 'id';

    //initial empty error messages
    const brandsEmptyMessage = "Brand options not available. Please contact the system administrator for assistance."
    const seasonsEmptyMessage = "Season options not available. Please contact the system administrator for assistance."
    const seasonsEmptyWithoutBrandMessage = "You need to select a brand before viewing season options. If the issue persists, contact the system administrator."
    const brandsEmptyWithoutCustomerMessage = "You need to select a customer before viewing brand options. If the issue persists, contact the system administrator."
    const seasonsEmptyWithoutCustomerMessage = "You need to select a customer before viewing season options. If the issue persists, contact the system administrator."
    const departmentsEmptyMessage = "Departments options not available. Please contact the system administrator for assistance."

    // Initial order inquiry state
    const initialOrderInquiryState: any = {
        [idFieldName]: null,
        [customerFieldName]: "",
        [brandFieldName]: "",
        [seasonFieldName]: "",
        [deparmentFieldName]: "",
        [yearFieldName]: "",
        [styleNumberPerPackFieldName]: "",
        [descriptionFieldName]: "",
    };

    const dispatch = useDispatch();
    const router = useRouter();

    const [orderInquiry, setOrderInquiry] = useState(initialOrderInquiryState);
    const [customers, setCustomers] = useState([]);
    const [brands, setBrands] = useState([]);
    const [seasons, setSeasons] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [yearList, setYearList] = useState([]);
    const [formValidationErrors, setFormValidationErrors] = useState<any>({hasErrors: false});
    const [prevCustomer, setPrevCustomer] = useState(0);

    const nextPageClicked = useRef(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isBrandsEmpty, setIsBrandsEmpty] = useState(false);
    const [isSeasonsEmpty, setIsSeasonsEmpty] = useState(false);
    
    const fetchData = () => {
        // Get all data needed for this page and summary component
        const requests = [
            api.get(restUrls.getOrderInquiryDetailsUpdateURL(orderId), { redirectToErrorPage: true }),
            api.get(restUrls.orderSizeGroupsURL(orderId)),
            api.get(restUrls.getGeneralInfoMetaDataURL())
        ]

        Promise.all(requests).then(resp => {
            const respData = resp.map(r => r.data);
            const [orderInquiry, orderSizeGroups, metadata] = respData;

            setOrderInquiry(orderInquiry);
            setCustomers(metadata?.customers);
            // setBrands(metadata?.brands);
            // setSeasons(metadata?.seasons);
            setYearList(metadata?.year_list);
            setPrevCustomer(orderInquiry?.[customerFieldName])
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

    // Save to database any change to state
    const saveOrderForm = () => {
        if (!orderInquiry?.id) {
            api.post(restUrls.createOrderInquiryURL(), orderInquiry).then(resp => {
                const respData = resp?.data;

                if (nextPageClicked.current) {
                    router.push(orderCountriesAddURL(respData?.id));
                } else {
                    router.replace(costingOrderEditURL(respData?.id));
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
        } else {
            api.patch(restUrls.getOrderInquiryDetailsUpdateURL(orderId), orderInquiry).then(() => {
                if (nextPageClicked.current) {
                    router.push(orderCountriesAddURL(orderId));
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
    };

    // For this to work, both the input field name and the state field name should match
    const handleOnChangeGeneralInfoForm = (event: any) => {
        const {name, value} = event?.target;
        const fieldName = name;

        if (fieldName in initialOrderInquiryState) {
            let currentState = {...orderInquiry};
            currentState[fieldName] = value;
            if (fieldName === customerFieldName && prevCustomer !== value) {
                currentState[brandFieldName] = 0;
            }
            setOrderInquiry({...currentState});
        }
    };

    // If order Inquiry changes validate errors if the form has any errors
    useEffect(() => {
        if (formValidationErrors.hasErrors) {
            validateForm();
        }
    }, [orderInquiry]);

    // Validate form and verify if there are any errors
    const validateForm = (save?: boolean) => {
        setIsSaving(true);

        const orderInquiryGeneralInfoSchema = yup.object({
            [customerFieldName]: yup.number().required("Customer is required"),
            [brandFieldName]: yup.number().required("Brand is required"),
            [seasonFieldName]: yup.number().required("Season is required"),
            [deparmentFieldName]: yup.number().required("Season is required"),
            [yearFieldName]: yup.number().required("Year is required"),
            [styleNumberPerPackFieldName]: yup.string().required("Style Number is required"),
            [descriptionFieldName]: yup.string(),
        });

        let formErrors = {hasErrors: false};

        orderInquiryGeneralInfoSchema.validate(orderInquiry, {abortEarly: false}).catch((err) => {
            formErrors = err.inner.reduce((acc: any, error: any) => {
                return {
                    ...acc,
                    [error.path]: error.errors,
                    hasErrors: true
                }
            }, {});
        }).then(() => {
            if (!formErrors.hasErrors && (nextPageClicked.current || save)) {
                saveOrderForm();
            } else {
                setIsSaving(false);
                nextPageClicked.current = false;
                setFormValidationErrors({...formErrors});
            }
        });
    }

    const handleNextButton = () => {
        nextPageClicked.current = true;
        validateForm();
    }

    useEffect(() => {
        if (orderId) {
            fetchData();
        } else {
            // Clear CostingReducer
            dispatch(setCostingReducerData({
                metadata: {},
                order_inquiry: {}
            }));

            fetchMetadata();
        }
    }, [orderId]);

    const fetchMetadata = () => {
        api.get(restUrls.getGeneralInfoMetaDataURL()).then(resp => {
            const metadata = resp?.data || {};

            setOrderInquiry(orderInquiry);
            setCustomers(metadata?.customers);
            // setBrands(metadata?.brands);
            // setSeasons(metadata?.seasons);
            setYearList(metadata?.year_list);

            // Set in CostingReducer
            dispatch(setCostingReducerData({
                metadata: metadata
            }));
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    } 

    const fetchCustomerBasedMetaData = () => {
        setPrevCustomer(orderInquiry?.[customerFieldName])
        if (orderInquiry?.[customerFieldName]) {
            const brandId = {
                brand_id : orderInquiry?.[brandFieldName] > 0 ? orderInquiry?.[brandFieldName] : null
            }
            api.post(restUrls.getGeneralInfoCustomerBrandFilteredMetaDataURL(orderInquiry?.[customerFieldName]), brandId)
                .then(resp => {
                    const metadata = resp?.data || {};
                    setBrands(metadata?.brands || []);
                    setIsBrandsEmpty(metadata?.brands?.length === 0);

                    setSeasons(metadata?.seasons || []);
                    setDepartments(metadata?.departments || []);
                    setIsSeasonsEmpty(metadata?.seasons?.length === 0); 
                })
                .catch(error => {
                    toast.error(getDefaultError(error?.response?.status));
                }).finally(()=> {
               
                })
        }
    }

    const getBrandAlertMessage = () => {
        if (isBrandsEmpty) {
          return brandsEmptyMessage;
        } else if (formValidationErrors?.[customerFieldName]) {
          return brandsEmptyWithoutCustomerMessage
        } else {
          return null;
        }
    };

    const getSeasonAlertMessage = () => {
        if (isBrandsEmpty) {
            return seasonsEmptyWithoutBrandMessage
        } else if (formValidationErrors?.[seasonFieldName] && orderInquiry?.[brandFieldName] === 0) {
            return seasonsEmptyWithoutBrandMessage
        } else if (isSeasonsEmpty) {
            return seasonsEmptyMessage
        } else if (formValidationErrors?.[customerFieldName]) {
          return seasonsEmptyWithoutCustomerMessage
        } else {
            return null
        }
    }

    useEffect(() => {
        fetchCustomerBasedMetaData()
    }, [orderInquiry?.[customerFieldName], orderInquiry?.[brandFieldName]]);

    return (
        <>
            {isLoading ? <DefaultLoader/> : (
                <CostingFormLayout step={0} formValues={orderInquiry}>
                    {customers?.length > 0 && (
                    <CostingCard id="customer-holder">
                        <RitzRadio
                            options={customers}
                            name={customerFieldName}
                            id={"customer"}
                            isMulti={false}
                            selectedValue={orderInquiry?.[customerFieldName]}
                            isRequired={true}
                            labelText={"Select Customer:"}
                            handleOnChange={handleOnChangeGeneralInfoForm}
                            optionValue={'id'}
                            optionText={'name'}
                            row={false}
                        ></RitzRadio>
                        <RitzFormErrors errorList={formValidationErrors?.[customerFieldName]}/>
                    </CostingCard>
                    )}

                    {(formValidationErrors?.[customerFieldName] || orderInquiry?.[customerFieldName] > 0) && (
                    <CostingCard id="brands-holder">
                        <RitzRadio
                          options={brands}
                          name={brandFieldName}
                          id={"brand"}
                          isMulti={false}
                          selectedValue={orderInquiry?.[brandFieldName]}
                          isRequired={true}
                          labelText={"Select Brand:"}
                          handleOnChange={handleOnChangeGeneralInfoForm}
                          optionValue={'id'}
                          optionText={'name'}
                          row={false}
                        ></RitzRadio>
                        {getBrandAlertMessage() && <Alert severity="error">{getBrandAlertMessage()}</Alert>}
                        <RitzFormErrors errorList={formValidationErrors?.[brandFieldName]}/>
                    </CostingCard>)}

                    {((orderInquiry?.[customerFieldName] > 0 && orderInquiry?.[brandFieldName] > 0) || isBrandsEmpty || formValidationErrors?.[customerFieldName] || formValidationErrors?.[seasonFieldName]) && 
                        <>
                            <CostingCard id="seasons-holder">
                                <RitzRadio
                                    options={departments}
                                    name={deparmentFieldName}
                                    id="department"
                                    isMulti={false}
                                    selectedValue={orderInquiry?.[deparmentFieldName]}
                                    isRequired={true}
                                    labelText="Select Department:"
                                    handleOnChange={handleOnChangeGeneralInfoForm}
                                    optionValue="id"
                                    optionText="department"
                                    row={false}
                                ></RitzRadio>
                                {departments?.length === 0 && <Alert severity="error">{departmentsEmptyMessage}</Alert>}
                                <RitzFormErrors errorList={formValidationErrors?.[deparmentFieldName]} />
                            </CostingCard>
                            <CostingCard id="seasons-holder">
                                <RitzRadio
                                    options={seasons}
                                    name={seasonFieldName}
                                    id="season"
                                    isMulti={false}
                                    selectedValue={orderInquiry?.[seasonFieldName]}
                                    isRequired={true}
                                    labelText="Select Season:"
                                    handleOnChange={handleOnChangeGeneralInfoForm}
                                    optionValue="id"
                                    optionText="name"
                                    row={false}
                                ></RitzRadio>
                                {getSeasonAlertMessage() && <Alert severity="error">{getSeasonAlertMessage()}</Alert>}
                                <RitzFormErrors errorList={formValidationErrors?.[seasonFieldName]} />
                            </CostingCard>
                        </>
                    }
                        
                    <CostingCard id="yearlist-holder">
                        <RitzRadio
                            options={yearList}
                            name={yearFieldName}
                            id={"year"}
                            isMulti={false}
                            selectedValue={orderInquiry?.[yearFieldName]}
                            isRequired={true}
                            labelText={"Select Year:"}
                            handleOnChange={handleOnChangeGeneralInfoForm}
                            optionValue={'id'}
                            optionText={'name'}
                            row={false}
                        />
                        <RitzFormErrors errorList={formValidationErrors?.[yearFieldName]}/>
                    </CostingCard>

                    <CostingCard id="stylenumber-holder">
                        <RitzInput
                            name={styleNumberPerPackFieldName}
                            id={"style_number"}
                            selectedValue={orderInquiry?.[styleNumberPerPackFieldName]}
                            isMulti={false}
                            isRequired={true}
                            row={false}
                            labelText={"Enter Style Number:"}
                            handleOnChange={handleOnChangeGeneralInfoForm}
                        />
                        <RitzFormErrors errorList={formValidationErrors?.[styleNumberPerPackFieldName]}/>
                    </CostingCard>

                    <CostingCard id="styledescription-holder">
                        <RitzInput
                            name={descriptionFieldName}
                            id={"style_description"}
                            selectedValue={orderInquiry?.[descriptionFieldName]}
                            isMulti={true}
                            row={false}
                            isRequired={true}
                            labelText={"Enter Description:"}
                            handleOnChange={handleOnChangeGeneralInfoForm}
                        />
                        <RitzFormErrors errorList={formValidationErrors?.[descriptionFieldName]}/>
                    </CostingCard>

                    <CostingActionButtons 
                        showSave={true} 
                        saveButtonOnClickAction={() => validateForm(true)} 
                        showNext={true} 
                        nextButtonOnClickAction={handleNextButton}
                        errors={formValidationErrors}
                        saving={isSaving}
                    />
                </CostingFormLayout>
            )}
        </>
    );
};

export default OrderInquiryGeneralInfoForm;