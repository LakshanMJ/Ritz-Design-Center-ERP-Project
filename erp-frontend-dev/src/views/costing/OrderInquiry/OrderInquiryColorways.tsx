import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { setCostingReducerData } from "@/states/costing/CostingActions";
import RitzTextInput from "@/components/Ritz/RitzNumberInput/RitzTextInput";
import { useRouter } from "next/router";
import CostingFormLayout from "@/components/OrderInquiry/Costing/CostingForm";
import CostingCard from "@/components/OrderInquiry/Costing/CostingCard";
import CostingActionButtons from "@/components/OrderInquiry/Costing/CostingActionButtons";
import {
    costingOrderItemsURL,
    orderColorwayMatrixURL
} from "@/helpers/constants/FrontEndUrls";
import * as yup from 'yup';
import RitzFormErrors from "@/components/Ritz/RitzFormErrors";
import DefaultLoader from "@/components/DefaultLoader";
import api from "@/services/api";
import * as restUrls from "@/helpers/constants/RestUrls";
import { toast } from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";


const OrderInquiryColorways = ({ orderId }: any) => {
    const numberOfColorwaysField = 'colorway_count';
    const numberOfColorwaysOrderInquiryField = 'number_of_colorways';
    const colorwaysField = 'colorways';
    const orderField = 'order';

    const router = useRouter();
    const dispatch = useDispatch();

    const [orderColorways, setOrderColorways] = useState([]);
    const [numberOfColorways, setNumberOfColorways] = useState(1);
    const [colorwayFormErrors, setColorwayFormErrors] = useState<{}>({hasErrors: false});
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const nextButtonClicked = useRef(false);
    const previousButtonClicked = useRef(false);

    useEffect(() => {
        if (colorwayFormErrors?.['hasErrors']) {
            validateColorways();
        }
    }, [orderColorways]);

    const fetchData = () => {
        // Get all data needed for this page and summary component
        const requests = [
            api.get(restUrls.getOrderInquiryDetailsUpdateURL(orderId)),
            api.get(restUrls.orderSizeGroupsURL(orderId)),
            api.get(restUrls.getGeneralInfoMetaDataURL()),
            // api.get(restUrls.getOrderColorwaysURL(orderId)), // can this api be deleted?
            api.get(restUrls.orderColorwayDetailsURL(orderId))
        ]

        Promise.all(requests).then(resp => {
            const respData = resp.map(r => r.data);
            const [orderInquiry, orderSizeGroups, metadata, orderCwDetails] = respData;

            setOrderColorways(orderCwDetails?.[colorwaysField]);
            setNumberOfColorways(orderCwDetails?.[numberOfColorwaysOrderInquiryField] || 0);

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

    useEffect(() => {
        if (orderId) {
            fetchData();
        }
    }, [orderId]);

    const saveColorways = () => {
        const payload = {[numberOfColorwaysOrderInquiryField]: numberOfColorways, [colorwaysField]: orderColorways};

        api.patch(restUrls.orderColorwayDetailsURL(orderId), payload).then(resp => {
            if (nextButtonClicked.current) {
                router.push(orderColorwayMatrixURL(orderId));
            } else if (previousButtonClicked.current) {
                router.push(costingOrderItemsURL(orderId));
            }
            setOrderColorways([...resp?.data?.colorways]);
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

    const handleSubInputChange = (orderColorwayInputData: any) => {
        setOrderColorways([...orderColorwayInputData]);
    }

    const handleColorwayCreateAndUpdate = (subInputValues: any) => {
        let newData = [...subInputValues];

        newData.map((inputValue: any, index) => {
            if (!inputValue['colorway']) {
                newData[index]['colorway'] = 'CW ' + (index + 1);
            }
        })
        setOrderColorways([...newData]);
    }

    const handleColorwayDelete = (event: any, data: any, index: number) => {
        let newData = [...orderColorways];
        newData.splice(index, 1);
        setOrderColorways([...newData]);
    }

    const validateColorways = (save=false) => {
        setIsSaving(true);

        const colorwaySchema = yup.object({
            [numberOfColorwaysField]: yup.number().typeError('Number of Colorways should be a number'),
            [colorwaysField]: yup.array().min(1, "At least 1 Colorway is required").test(
                'colorway_matching_error',
                "Colorway's doesn't match",
                (value, context) => {
                    let nonEmptyCWs = value.filter((cw: any) => (cw.colorway.trim().length > 0));
                    if (value.length != numberOfColorways) {
                        return context.createError({message: `Number of Colorways doesn't match Colorways entered`});
                    } else if (nonEmptyCWs.length != numberOfColorways) {
                        return context.createError({message: `Please enter ${numberOfColorways} Colorways`});
                    }
                    return true;
                }
            )
        });
        let colorwayFormErrors = {hasErrors: false};
        colorwaySchema.validate({
            [numberOfColorwaysField]: numberOfColorways,
            [colorwaysField]: orderColorways
        },  {abortEarly: false}).catch((err) => {

            colorwayFormErrors = err.inner.reduce((acc: any, error: any) => {
                return {
                    ...acc,
                    [error.path]: error.errors,
                    hasErrors: true
                }
            }, {});
        }).then(() => {
            if (!colorwayFormErrors.hasErrors) {
                setColorwayFormErrors({...colorwayFormErrors, hasErrors: false});
                if (save) {
                    saveColorways();
                } else {
                    setIsSaving(false);
                }
            } else {
                setIsSaving(false);
                nextButtonClicked.current = false;
                previousButtonClicked.current = false;
                setColorwayFormErrors({...colorwayFormErrors});
            }
        });
    }

    const handleOnChangeNumColorways = (event: any, numInputs: number) => {
        setNumberOfColorways(numInputs);
    }

    const handleNextButton = () => {
        nextButtonClicked.current = true;
        validateColorways(true);
    }

    const handlePreviousButton = () => {
        previousButtonClicked.current = true;
        validateColorways(true);
    }

    return (
        <>{isLoading ? <DefaultLoader/> : 
            <CostingFormLayout step={4} formValues={{colorways: orderColorways}}>
                <CostingCard>
                    <RitzTextInput
                        name={'colorways'}
                        id={'colorways'}
                        labelText={'Colorways'}
                        selectedValue={numberOfColorways}// TODO - changes this
                        handleOnChange={{}}
                        handleOnBlur={{}}
                        headerText={"Colorway Names"}
                        currentData={orderColorways || []}
                        currentDataDisplayValueField={'colorway'}
                        currentDataValueField={'id'}
                        handleOnCreateAndUpdate={handleColorwayCreateAndUpdate}
                        handleOnSubInputsChange={handleSubInputChange}
                        handleOnDelete={handleColorwayDelete}
                        handleOnChangeNumInputs={handleOnChangeNumColorways}
                    ></RitzTextInput>
                    <RitzFormErrors errorList={colorwayFormErrors?.[numberOfColorwaysField]}/>
                    <RitzFormErrors errorList={colorwayFormErrors?.[colorwaysField]}/>
                </CostingCard>

                <CostingActionButtons
                    showSave={true}
                    saveButtonOnClickAction={() => validateColorways(true)}
                    showNext={true}
                    nextButtonOnClickAction={handleNextButton}
                    showPrevious={true}
                    previousButtonOnClickAction={handlePreviousButton}
                    errors={colorwayFormErrors}
                    saving={isSaving}
                />
            </CostingFormLayout>
        }</>
    );
};

export default OrderInquiryColorways;

