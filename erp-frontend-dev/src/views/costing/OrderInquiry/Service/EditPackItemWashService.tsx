import {
    Table,
    TableContainer,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Card,
    Tooltip,
    Box, InputLabel, Checkbox, Button, Paper
} from "@mui/material";
import React, {useEffect, useState} from "react";
import api from "@/services/api";
import {getNavigationOrderMaterialURL, getOrderInquiryDetailsUpdateURL, performCostingURL} from "@/helpers/constants/RestUrls";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import InfoIcon from '@mui/icons-material/Info';
import DefaultLoader from "@/components/DefaultLoader";
import * as RestUrls from "@/helpers/constants/rest_urls/CostingUrls";
import RitzInput from "@/components/Ritz/RitzInput";
import FormErrorMessage from "@/components/FormErrorMessage";
import RitzTable from "@/components/Ritz/RitzTable";
import RitzModal from "@/components/Ritz/RitzModal";
import SaveSpinner from "@/components/SaveSpinner";
import {
    packItemEMBCreateUpdateURL,
    packItemPrintCreateUpdateURL,
    packItemPrintDetailDeleteURL, packItemWashCreateUpdateURL, packItemWashDetailDeleteURL
} from "@/helpers/constants/rest_urls/CostingUrls";
import {DEFAULT_SUCCESS} from "@/helpers/constants/Constants";
import RitzMultipleFileUploader from "@/components/Ritz/RitzMultipleFileUploader";
import RitzMultiSelectCheckBox from "@/components/Ritz/RitzMultiSelectCheckBox";
import RitzSingleFileUploader from "@/components/Ritz/RitzSingleFileUploader";
import { LISTVIEW } from "@/helpers/constants/FileUpload";
import RitzSelection from "@/components/Ritz/RitzSelection";
import PackDetails from "@/views/costing/PackDetails";


const EditPackItemEMBService = ({ orderId, versionId, packItemId, packItemWashId, modalOpen, setModalOpen, setUpdated, itemId, colorwayId, countryId }: any) => {
    const techniqueKey = 'technique';
    const orderPackItemsKey = 'order_pack_items';
    const uploadType = "listView"
    const fileAttacehemtLocation = `costing/materials/washservices/`;

    const [isLoading, setIsLoading]  = useState(true);
    const [packItems, setPackItems] = useState([]);
    const [packItemWashData, setPackItemWashData] = useState<any>({});
    const [selectedPackItemIds, setSelectedPackItemIds] = useState([]);
    const [formErrors, setFormErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [selectedVideoId, setSelectedVideoId] = useState(null);
    const [videoDataArray, setVideoDataArray] = useState([]);//pending API uploads
    const [displayPackDetails, setDisplayPackDetails] = useState<any>([]);
    const [orderInquiry, setOrderInquiry] = useState<any>({});
    const [itemData, setItemData] = useState<any>({order_item_id:itemId});
    const [isLoadingPackItems, setIsLoadingPackItems] = useState(false);

    const resetFormStates = () => {
        setFormErrors({});
        setPackItems([]);
        setPackItemWashData({});
    }
    useEffect(() => {
        if (orderId && versionId && packItemId && modalOpen) {
            fetchWashServiceData();
        }

        if (!modalOpen) {
            resetFormStates();
        }

    }, [orderId, versionId, packItemWashId, packItemId, modalOpen]);

    const handleSaveWashService = () => {
        setIsSaving(true);
        const saveUrl = RestUrls.packItemWashCreateUpdateURL(orderId, versionId, packItemId);
        const apiPayload = {...packItemWashData, pack_item_ids: selectedPackItemIds};

        api.post(saveUrl, apiPayload).then(resp => {
           toast.success(DEFAULT_SUCCESS);
           setModalOpen(false);
           setUpdated(true);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            setFormErrors(error?.response?.data?.errors);
        }).finally(() => {setIsSaving(false)});
    }

    const fetchWashServiceData = () => {
        const washDetailDeleteUrl = RestUrls.packItemWashDetailDeleteURL(versionId, packItemWashId);
        const packItemsUrl = getNavigationOrderMaterialURL(orderId, versionId);
        const orderInquiryDetails = getOrderInquiryDetailsUpdateURL(orderId);

        const dataUrls = [
            api.get(packItemsUrl),
            api.get(orderInquiryDetails),

        ];

        if (packItemWashId) {
            dataUrls.push(api.get(washDetailDeleteUrl));
        }

        Promise.all(dataUrls).then(resp => {
            setIsLoading(true);
            const respData = resp.map((r: any) => r.data);
            const [packItems, orderInqiryData, washDetail] = respData;
            const packItemList = packItems.order_pack_items.map((item: any) => ({
                id: item.id,
                colorway_category: item.colorway_category,
                country_id: item.country_id,
                size_id: item.size_id,
                reviewed: item.reviewed ? 1 : 0,
                item_id: item.item_id,
                colorway_id: item.colorway_id,
                display_name: `${item.country_name} - ${item.colorway_name}(${item.colorway_category}) - ${item.item_name} [ ${item.item_identifier} ] - ${item.size_name} - Pack `,
            }));
            setDisplayPackDetails([...packItems.order_pack_items]);
            setPackItems([...packItemList]);
            setPackItemWashData(washDetail || {});
            if(packItemWashId){
                setSelectedPackItemIds([parseInt(washDetail.pack_item)]);
            }
            else{
                setSelectedPackItemIds([parseInt(packItemId)]);
            }
            
            setOrderInquiry(orderInqiryData);

            if (packItemWashId) {
                if (washDetail.wash_service_attachment != null) {
                    const getSelectedVideoDetails = [
                        {
                            display_name: washDetail.attachment_display_name,
                            file_path: washDetail.attachment_file_path,
                            id: washDetail.wash_service_attachment
                        }
                    ];
                    if (getSelectedVideoDetails.some((videoData) => videoData.id !== null)) {
                        setVideoDataArray(getSelectedVideoDetails);
                    }
                }   
            }
          
        }).catch(error => {
            console.log(error)
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
            setIsLoadingPackItems(false)
        });
    }
    const getPackItemsRelatedToOrderItem = () => {
        const filteredItemIds = packItems.filter(item => item.item_id === itemData.order_item_id && item.colorway_id == parseInt(colorwayId) && item.country_id == parseInt(countryId)).map(item => item.id);
        setSelectedPackItemIds(filteredItemIds);
    };

    const handleChange = (event: any) => {
        const name = event.target.name;
        const value = event.target.value;
        setPackItemWashData({...packItemWashData, [name]: value})
    }

    const handleFileChange = (attachment: any) => {
        const attachmentId = attachment.length > 0 ? attachment[0].id : null;
        setSelectedVideoId(attachmentId)
        if (attachment.length === 0) {
          setSelectedVideoId(0)
        }
      };
      
    const handleChangeItem = (event: any) => {
        setItemData({ ...itemData, [event?.target?.name]: event?.target?.value, });

    };

    const handleSelectedIdsChange = (newSelectedIds:any) => {
        setSelectedPackItemIds(newSelectedIds);
    };

    useEffect(() => {
        setPackItemWashData((prevState: any) => ({
            ...prevState,
            wash_service_attachment: selectedVideoId === 0 ? null : selectedVideoId,
        }));
    }, [selectedVideoId]);
    useEffect(() => {
        if (itemData.order_item_id) {  
            getPackItemsRelatedToOrderItem();
        }
    }, [itemData.order_item_id]);


    const getEMBPrintForm = () => {
        return (
            isLoading ? <DefaultLoader /> : (
                <>
                    <Box marginBottom={3}>
                        <InputLabel sx={{ mb: 1 }}>Item:</InputLabel>
                        <RitzSelection
                            id={'order_item_id'}
                            name={'order_item_id'}
                            optionValue={'id'}
                            optionText={'name'}
                            selectedValue={itemData.order_item_id || ''}
                            isRequired={true}
                            options={orderInquiry.items}
                            handleOnChange={handleChangeItem}
                            isReadOnly={itemId !== undefined ? true : false}

                        />
                        {/* <FormErrorMessage message={formErrors?.[techniqueKey]} /> */}
                    </Box>
                    <Box marginBottom={3}>
                        <InputLabel sx={{ mb: 1 }}>Techniques:</InputLabel>
                        <RitzInput
                            name={techniqueKey}
                            id={"wash_technique"}
                            selectedValue={packItemWashData?.[techniqueKey] || ''}
                            isMulti={true}
                            multiline
                            row={true}
                            isRequired={true}
                            handleOnChange={handleChange}
                        />
                       <FormErrorMessage message={formErrors?.[techniqueKey]} />
                    </Box>

                    <Box marginBottom={3}>
                        <InputLabel sx={{ mb: 1 }}>Uploads</InputLabel>
                        <RitzSingleFileUploader 
                        displayType={uploadType} 
                        selectedFilesParent={videoDataArray || []} 
                        handleFileChangeParent={(selectedFiles: any) => handleFileChange(selectedFiles)} 
                        filelocation={fileAttacehemtLocation}
                         />
                    </Box>
                    <Box marginBottom={3} >
                        <PackDetails
                            packItemData={displayPackDetails}
                            selectedIds={selectedPackItemIds}
                            onSelectedIdsChange={handleSelectedIdsChange}
                            isLoading={isLoadingPackItems} />
                    </Box>
                    <Box sx={{ mt: 5, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={() => handleSaveWashService()} variant="contained" disabled={isSaving}>
                            {isSaving && <SaveSpinner />}Save
                        </Button>
                    </Box>
                </>
            )
        );
    }

    return (
        <RitzModal open={modalOpen} title={"Add/Edit Wash Service"} onClose={() => {setModalOpen(false)}} maxWidth={'lg'}>
            {getEMBPrintForm()}
        </RitzModal>
    );
};

export default EditPackItemEMBService;
