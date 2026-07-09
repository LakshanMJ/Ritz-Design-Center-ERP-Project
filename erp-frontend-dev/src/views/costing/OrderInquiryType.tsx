import React, { useEffect, useRef } from "react";
import RitzRadio from "@/components/Ritz/RitzRadio";
import RitzInput from "@/components/Ritz/RitzInput";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { setCostingReducerData } from "@/states/costing/CostingActions";
import { useRouter } from "next/router";
import DefaultLoader from "@/components/DefaultLoader";
import CostingActionButtons from "@/components/OrderInquiry/Costing/CostingActionButtons";
import CostingCard from "@/components/OrderInquiry/Costing/CostingCard";
import RitzFormErrors from "@/components/Ritz/RitzFormErrors";
import * as yup from "yup";
import api from "@/services/api";
import * as restUrls from "@/helpers/constants/RestUrls";
import { costingGeneralIfoURL, costingOrderEditURL, orderCountriesAddURL } from "@/helpers/constants/FrontEndUrls";
import { toast } from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import { Alert, Box, Button, Card, CardHeader, Divider, InputLabel, Typography } from "@mui/material";
import SaveSpinner from "@/components/SaveSpinner";
import RitzModal from "@/components/Ritz/RitzModal";


const OrderInquiryTypeForm = ({ orderId, programeID }: any) => {
    const customerFieldName = 'customer';
    const brandFieldName = 'brand';
    const seasonFieldName = 'season';
    const ordersPerProgramFieldName = 'number_of_orders';
    const yearFieldName = 'year';
    const idFieldName = 'id';

    //initial empty error messages
    const brandsEmptyMessage = "Brand options not available. Please contact the system administrator for assistance."
    const seasonsEmptyMessage = "Season options not available. Please contact the system administrator for assistance."
    const seasonsEmptyWithoutBrandMessage = "You need to select a brand before viewing season options. If the issue persists, contact the system administrator."
    const brandsEmptyWithoutCustomerMessage = "You need to select a customer before viewing brand options. If the issue persists, contact the system administrator."
    const seasonsEmptyWithoutCustomerMessage = "You need to select a customer before viewing season options. If the issue persists, contact the system administrator."

    // Initial order inquiry state
    const initialOrderInquiryState: any = {
        [idFieldName]: null,
        [customerFieldName]: "",
        [brandFieldName]: "",
        [seasonFieldName]: "",
        [ordersPerProgramFieldName]: "",
        [yearFieldName]: "",
    };

    const dispatch = useDispatch();
    const router = useRouter();

    //const [orderInquiry, setOrderInquiry] = useState(initialOrderInquiryState);
    const [customers, setCustomers] = useState([]);
    const [brands, setBrands] = useState([]);
    const [seasons, setSeasons] = useState([]);
    const [yearList, setYearList] = useState([]);
    const [programOrderInquries, setProgramOrderInquries] = useState([]);
    const [programDetails, setProgramDetails] = useState(initialOrderInquiryState);
    const [openConfirmModal, setOpenConfirmModal] = useState(false);
    const [prevCustomer, setPrevCustomer] = useState(0);

    const [formValidationErrors, setFormValidationErrors] = useState({ hasErrors: false });
    const nextPageClicked = useRef(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProgramValue, setSelectedProgramValue] = useState(null);
    const [isBrandsEmpty, setIsBrandsEmpty] = useState(false);
    const [isSeasonsEmpty, setIsSeasonsEmpty] = useState(false);

    const fetchData = () => {
        const requests = [
            api.get(restUrls.getGeneralInfoMetaDataURL())
        ]

        Promise.all(requests).then(resp => {
            const respData = resp.map(r => r.data);
            const [metadata] = respData;
            setCustomers(metadata?.customers);
            // setBrands(metadata?.brands);
            // setSeasons(metadata?.seasons);
            setYearList(metadata?.year_list);

            // Set in CostingReducer
            dispatch(setCostingReducerData({
                metadata: metadata,
            }));

        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    const getOrderProgramData = () => {
        setIsLoading(true);
        api.get(restUrls.updateOrderProgramURL(programeID))
            .then(resp => {
                const resdata = resp?.data || [];
                setProgramDetails({...resdata});
            })
            .catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            })
            .finally(() => setIsLoading(false));
    };

    // Save to database any change to state
    const saveOrderForm = () => {

        let apiUrl;
        let requestMethod;

        if (programDetails.id == null) {
            apiUrl = restUrls.createOrderProgramURL();
            requestMethod = 'POST';

        } else {
            apiUrl = restUrls.updateOrderProgramURL(programDetails.id);
            requestMethod = 'PUT';
        }
        api({
            method: requestMethod,
            url: apiUrl,
            data: programDetails
        }).then(resp => {
            const respData = resp?.data;
            setProgramDetails({ ...respData })
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsSaving(false);
        });
    };

    const handleConfirmModal = () => {
        setOpenConfirmModal(true)
        
    };
    const handleOnconfirm = () => {
        const programStatus = {
            program_confirmed: true
        };
        api.post(restUrls.confirmOrderProgramURL(programDetails.id), programStatus).then(resp => {
            const respData = resp?.data;
            setProgramOrderInquries([...respData])
            handlenextpage(respData)

        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsSaving(false);
        });
    }
    const handleCloseConfirm = () => {
        setOpenConfirmModal(false);
        
    }
    const handlenextpage = (orderInquiries: any) => {
        const orderInquiry = orderInquiries[0].id;
        router.replace(costingOrderEditURL(orderInquiry));

    }


    // For this to work, both the input field name and the state field name should match
    const handleOnChangeGeneralInfoForm = (event: any) => {
        const { name, value } = event?.target;
        const fieldName = name;

        if (fieldName in initialOrderInquiryState) {
            let currentState = { ...programDetails };
            currentState[fieldName] = value;
            if (fieldName === customerFieldName && prevCustomer !== value) {
                currentState[brandFieldName] = 0;
            }
            setProgramDetails({ ...currentState });
        }
    };

    // If order Inquiry changes validate errors if the form has any errors
    useEffect(() => {
        if (formValidationErrors.hasErrors) {
            validateForm();
        }
    }, [programDetails]);

    // Validate form and verify if there are any errors
    const validateForm = (save?: boolean) => {
        setIsSaving(true);

        const orderInquiryGeneralInfoSchema = yup.object({
            [customerFieldName]: yup.number().required("Customer is required"),
            [brandFieldName]: yup.number().required("Brand is required"),
            [seasonFieldName]: yup.number().required("Season is required"),
            [ordersPerProgramFieldName]: yup.string().required("Number of order required "),
        });

        let formErrors = { hasErrors: false };

        orderInquiryGeneralInfoSchema.validate(programDetails, { abortEarly: false }).catch((err) => {
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
                setFormValidationErrors({ ...formErrors });
            }
        });
    }

    const handleNextButton = () => {
        nextPageClicked.current = true;
        validateForm();
    }

    useEffect(() => {
     if(programeID > 0){
        getOrderProgramData()
     }
    }, [programeID])
    
    useEffect(() => {
        if (orderId) {
            fetchData();
        } else {
            // Clear CostingReducer
            dispatch(setCostingReducerData({
                metadata: {}
            }));

            fetchMetadata();
        }
    }, [orderId]);

    const fetchMetadata = () => {
        api.get(restUrls.getGeneralInfoMetaDataURL()).then(resp => {
            const metadata = resp?.data || {};

            // setProgramDetails(programDetails);
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
    //addding new part
    const handleButtonClick = (value: any) => {
        setSelectedProgramValue(value);
    };

    const fetchCustomerBasedMetaData = () => {
        setPrevCustomer(programDetails?.[customerFieldName])
        if (programDetails?.[customerFieldName]) {
            const brandId = {
                brand_id : programDetails?.[brandFieldName] > 0 ? programDetails?.[brandFieldName] : null
            }
            api.post(restUrls.getGeneralInfoCustomerBrandFilteredMetaDataURL(programDetails?.[customerFieldName]), brandId)
                .then(resp => {
                    const metadata = resp?.data || {};
                    setBrands(metadata?.brands || []);
                    setIsBrandsEmpty(metadata?.brands?.length === 0);

                    setSeasons(metadata?.seasons || []);
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
        } else if (formValidationErrors?.[seasonFieldName] && programDetails?.[brandFieldName] === 0) {
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
    }, [programDetails?.[customerFieldName], programDetails?.[brandFieldName]]);

    useEffect(() => {
        if (selectedProgramValue == 'not_program') {
            router.push(costingGeneralIfoURL());
        }
    }, [selectedProgramValue]);
    return (
        <>
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                        <>
                            <CostingCard id="stylenumber-holder">
                                <RitzInput
                                    name={ordersPerProgramFieldName}
                                    id={"number_of_orders"}
                                    selectedValue={programDetails?.[ordersPerProgramFieldName]}
                                    isMulti={false}
                                    isRequired={true}
                                    row={false}
                                    labelText={"Enter Number Of Orders:"}
                                    handleOnChange={handleOnChangeGeneralInfoForm}
                                />
                                <RitzFormErrors errorList={formValidationErrors?.[ordersPerProgramFieldName]} />
                            </CostingCard>

                            {customers?.length > 0 && (
                                <CostingCard id="customer-holder">
                                    <RitzRadio
                                        options={customers}
                                        name={customerFieldName}
                                        id={"customer"}
                                        isMulti={false}
                                        selectedValue={programDetails?.[customerFieldName]}
                                        isRequired={true}
                                        labelText={"Select Customer:"}
                                        handleOnChange={handleOnChangeGeneralInfoForm}
                                        optionValue={'id'}
                                        optionText={'name'}
                                        row={false}
                                    />
                                    <RitzFormErrors errorList={formValidationErrors?.[customerFieldName]} />
                                </CostingCard>)}

                            {(formValidationErrors?.[customerFieldName] || programDetails?.[customerFieldName] > 0) && (
                                <CostingCard id="brands-holder">
                                    <RitzRadio
                                      options={brands}
                                      name={brandFieldName}
                                      id={"brand"}
                                      isMulti={false}
                                      selectedValue={programDetails?.[brandFieldName]}
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

                            {((programDetails?.[customerFieldName] > 0 && programDetails?.[brandFieldName] > 0) || isBrandsEmpty || formValidationErrors?.[customerFieldName] || formValidationErrors?.[seasonFieldName]) && 
                                <CostingCard id="seasons-holder">
                                    <RitzRadio
                                        options={seasons}
                                        name={seasonFieldName}
                                        id="season"
                                        isMulti={false}
                                        selectedValue={programDetails?.[seasonFieldName]}
                                        isRequired={true}
                                        labelText="Select Season:"
                                        handleOnChange={handleOnChangeGeneralInfoForm}
                                        optionValue="id"
                                        optionText="name"
                                        row={false}
                                    ></RitzRadio>
                                    {getSeasonAlertMessage() && <Alert severity="error">{getSeasonAlertMessage()}</Alert>}
                                    <RitzFormErrors errorList={formValidationErrors?.[seasonFieldName]} />
                                </CostingCard>}

                                <CostingCard id="yearlist-holder">
                                    <RitzRadio
                                        options={yearList}
                                        name={yearFieldName}
                                        id={"year"}
                                        isMulti={false}
                                        selectedValue={programDetails?.[yearFieldName]}
                                        isRequired={true}
                                        labelText={"Select Year:"}
                                        handleOnChange={handleOnChangeGeneralInfoForm}
                                        optionValue={'id'}
                                        optionText={'name'}
                                        row={false}
                                    />
                                    <RitzFormErrors errorList={formValidationErrors?.[yearFieldName]} />
                                </CostingCard>

                            <Box style={{ display: 'flex', alignItems: 'center' }}>
                                <CostingActionButtons
                                    showSave={true}
                                    saveButtonOnClickAction={() => validateForm(true)}
                                    showNext={false}
                                    nextButtonOnClickAction={handleNextButton}
                                    errors={formValidationErrors}
                                    saving={isSaving}
                                />
                                {programDetails.id != null && (
                                    <Button sx={{ float: 'right', ml: 2 }} variant='contained' disabled={isSaving} onClick={handleConfirmModal} >{isSaving && <SaveSpinner />}Confirm</Button>
                                )}

                            </Box>
                        </>
                </>
            )}
            {openConfirmModal && (
                <RitzModal open={openConfirmModal} onClose={handleCloseConfirm} title='Confirmation'>
                   Are you sure you want to confirm this program? After confirming the program the attributes in it won't be editable.
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'end' }}>
                        <Button variant="contained"   onClick={() => {handleOnconfirm()}} >Ok</Button>
                        <Button variant="contained" color='secondary' onClick={() => {handleCloseConfirm()}} style={{ marginLeft: '10px' }} >Close</Button>
                    </Box>
                </RitzModal>

            )}
        </>
    );
};

export default OrderInquiryTypeForm;

const LableStyle = {
    marginBottom: 3,
    color: '#333'
}

