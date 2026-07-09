import {Table,TableContainer,TableHead,TableRow,TableCell, TableBody,Box, InputLabel, Checkbox, Button, TextField, Switch} from "@mui/material";
import React, {useEffect, useState} from "react";
import api from "@/services/api";
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
import {DEFAULT_SUCCESS} from "@/helpers/constants/Constants";
import RitzMultipleFileUploader from "@/components/Ritz/RitzMultipleFileUploader";
import RitzSelection from "@/components/Ritz/RitzSelection";
import RitzSingleFileUploader from "@/components/Ritz/RitzSingleFileUploader";
import { LISTVIEW } from "@/helpers/constants/FileUpload";
import { debug } from "console";
import { getOrderInquiryDetailsUpdateURL } from "@/helpers/constants/RestUrls";


const EditPackItemEMBService = ({ orderId, versionId, packItemId, packItemEMBId, modalOpen, setModalOpen, setUpdated, colorwayId, itemId, countryId }: any) => {

    const techniqueKey = 'technique';
    const uploadType = "listView"
    const fileAttacehemtLocation = `costing/materials/embservices/`;
    const embDetailsKey = 'embellishment_attachment';

    const embellishmentTypeKey = 'type';
    const embellishmentSubTypeKey = 'sub_type';
    const embellishmentGradingKey = 'grading';
    const embellishmentSizesKey = 'sizes';


    const [isLoading, setIsLoading]  = useState(true);
    const [packItemEMBData, setPackItemEMBData] = useState<any>({embellishment_service_detail_id:null});
    const [selectedPackItemIds, setSelectedPackItemIds] = useState([]);
    const [formErrors, setFormErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [attachmentArray, setAttachmentArray] = useState([]);
    const [embellishmentTypes, setEmbellishmentTypes] = useState([]); 
    const [embellishmentSubTypes, setEmbellishmentSubTypes] = useState([]);
    const [embellishmentSizesList, setEmbellishmentSizesList] = useState([]);
    const [inputEmbSizeValue, setInputEmbSizeValue] = useState([]);
    const [focusedInputIndex, setFocusedInputIndex] = useState<number | null>(null);
    const [selectedvideoDataArray, setSelectedvideoDataArray] = useState([]);
    const [orderInquiry, setOrderInquiry] = useState<any>({});
    const [itemData, setItemData] = useState<any>({order_item_id:itemId});
    const resetFormStates = () => {
        setFormErrors({});
        setPackItemEMBData({});
        setInputEmbSizeValue([]);
        setEmbellishmentSubTypes([]);
        setSelectedvideoDataArray([]);
        setIsLoading(true)
    }

    const handleOptionChange = (option:any) => {
        setPackItemEMBData({ ...packItemEMBData, grading: option });
     
    };
    const handleSaveEmbellishment = () => {
        setIsSaving(true);

        const saveUrl = RestUrls.packItemEMBCreateUpdateURL(orderId, versionId);
        const packDetails = inputEmbSizeValue.filter(item => item.isChecked != true).map((packItem: any) => ({    
            pack_item_embellishment_attachment: packItem?.pack_item_embellishment_attachment[0]?.id || null,
            pack_item: packItem.pack_item,
            size: packItem.size
        }));
        const apiPayload = {
            grading: packItemEMBData.grading, 
            type: packItemEMBData.type || null,
            sub_type: packItemEMBData.sub_type || null,
            embellishment_service_detail_id: packItemEMBData.embellishment_service_detail_id || null,
            embellishment_attachment: packItemEMBData.embellishment_attachment || null,
            sizes: packDetails
        };

        api.post(saveUrl, apiPayload).then(resp => {
           toast.success(DEFAULT_SUCCESS);
           setModalOpen(false);
           setUpdated(true);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            setFormErrors(error?.response?.data);
        }).finally(() => {setIsSaving(false)});
    }

    const getEmbellishmentList = () => {
        api.get(RestUrls.getDetailEmbellishmentTypeURL(packItemEMBData?.[embellishmentTypeKey])).then(resp => {
            const resdata = resp?.data || [];
            setEmbellishmentSubTypes([...resdata.embellishmentsubtype_set]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };
    const getInquiryData= () => {
        api.get(getOrderInquiryDetailsUpdateURL(orderId)).then(resp => {
            const resdata = resp?.data || [];
            setOrderInquiry(resdata);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    const fetchEMBData = () => {
        const embDetailUrl = RestUrls.packItemEMBDetailURL( packItemEMBId);
        const embTypeUrl = RestUrls.createEmbellishmentTypeURL();
        const orderSizeData = RestUrls.getEmbellishmentSizesDetailsURL(orderId, versionId, itemData.order_item_id, countryId, colorwayId );

        const dataUrls = [
            api.get(embTypeUrl),
            api.get(orderSizeData)
        ];
        if (packItemEMBId) {
            dataUrls.push(api.get(embDetailUrl));
        }

        Promise.all(dataUrls).then(resp => {
            setIsLoading(true);
            const respData = resp.map((r: any) => r.data);
            const [embTypes, sizesDetails, embDetail] = respData;
            setEmbellishmentTypes(embTypes)
            setEmbellishmentSizesList([...sizesDetails])
            setPackItemEMBData(embDetail || {});
            setAttachmentArray(embDetail?.['embroidery_details_attachment'] ? [embDetail?.['embroidery_details_attachment']] :[]);
            setPackItemEMBData({...packItemEMBData, grading: true})
          
            if (packItemEMBId) {
                setPackItemEMBData((prev:any) => ({
                    ...prev,
                    embellishment_service_detail_id: embDetail.id,
                    type: embDetail.type,
                    sub_type: embDetail.sub_type,
                    grading: embDetail.grading,
                    embellishment_attachment: embDetail.embellishment_attachment,

                  }));
                
                const newState = embDetail.sizes.map((pack: any) => ({
                    pack_item_embellishment_attachment: pack.pack_item_embellishment_attachment?[{
                        display_name: pack.attachment_display_name,
                        file_path: pack.attachment_file_path,
                        id: pack.pack_item_embellishment_attachment
                    }]
                    : [], 
                    pack_item: pack.pack_item,
                    size: pack.size
                }));
                
                setInputEmbSizeValue([...newState]);
                
                 if(embDetail.embellishment_attachment!=null)
                  {       
                    const getSelectedVideoDetails = [
                        {
                          display_name: embDetail.attachment_display_name,
                          file_path: embDetail.attachment_file_path,
                          id: embDetail.embellishment_attachment
                        }
                      ];
                    if (getSelectedVideoDetails.some((videoData) => videoData.id !== null)) {
                        setSelectedvideoDataArray(getSelectedVideoDetails);
                      }
                  }   
            }
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }


    const handleChange = (event: any) => {
        const name = event.target.name;
        const value = event.target.value;
        setPackItemEMBData({...packItemEMBData, [name]: value})
    }

    const handleChangeItem = (event: any) => {
        setItemData({ ...itemData, [event?.target?.name]: event?.target?.value, });

    };

    const updateTextFieldsData = (id:any, field:any, value:any) => {
        const index = inputEmbSizeValue.findIndex((item) => item.pack_item === id);
        if (packItemEMBData.grading === false && field !='pack_item_embellishment_attachment' ) {
            const updatedValues = embellishmentSizesList.map((item) => ({
                pack_item: item.id,
                pack_item_embellishment_attachment: [],
                [field]: value,
            }));
            setInputEmbSizeValue(updatedValues);
        }
        else{
                if (index !== -1) {
                    const updatedItem = { ...inputEmbSizeValue[index], [field]: value };
                    const updatedData = [...inputEmbSizeValue];
                    updatedData[index] = updatedItem;
                    setInputEmbSizeValue(updatedData);
                } else {

                    let newItem = { 
                        pack_item: id,
                        [field]: value,
                      };
                      if (field !== 'pack_item_embellishment_attachment') {
                        newItem['pack_item_embellishment_attachment'] = [];
                      }
                    setInputEmbSizeValue((prevData) => [...prevData, newItem]);
                }
        }
       
       
    };
    
    
    const handleFileChangeSize = (attachments:any, packId:any) => {
        updateTextFieldsData(packId, 'pack_item_embellishment_attachment', attachments);
    };
    
    const handleTextFieldChange = (event:any, fieldName:any, id:any) => {
        const newValue = event.target.value;
        updateTextFieldsData(id, 'size', newValue);
    };

    const handleChangeCheckBox = (event:any, packId:any) => {
        const updatedSizeList = embellishmentSizesList.map((sizePack:any) => {
            if (sizePack.id === packId) {
                return {
                    ...sizePack,
                    isChecked: event.target.checked,
                };
            }
            return sizePack;
        });
        setEmbellishmentSizesList(updatedSizeList);
        const updatedInputSizeList = inputEmbSizeValue.map((inputSize:any) => {
            if (inputSize.pack_item === packId) {
                return {
                    ...inputSize,
                    isChecked: event.target.checked,
                };
            }
            return inputSize;
        });
        setInputEmbSizeValue(updatedInputSizeList);
    };

    const handleFileChange = (attachment: any) => {
        const attachmentId = attachment.length > 0 ? attachment[0]?.id : null;

        setPackItemEMBData({...packItemEMBData, [embDetailsKey]: attachmentId});

      };
    
    useEffect(() => {
            getInquiryData(); 
    }, []);

    
    useEffect(() => {
        if (packItemEMBData.type) {
            getEmbellishmentList();
        }
    }, [packItemEMBData.type]);

    useEffect(() => {
        setFocusedInputIndex(null);
     }, [packItemEMBData, selectedPackItemIds]);

    useEffect(() => {
        if (orderId && versionId && modalOpen && itemData.order_item_id) {
            fetchEMBData();
        }

        if (!modalOpen) {
            resetFormStates();
        }

    }, [orderId, versionId, packItemEMBId, modalOpen, itemData.order_item_id]);

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
                        <InputLabel sx={{ mb: 1 }}>EMB Category:</InputLabel>
                        <RitzSelection
                            id={embellishmentTypeKey}
                            name={embellishmentTypeKey}
                            optionValue={'id'}
                            optionText={'name'}
                            selectedValue={packItemEMBData?.[embellishmentTypeKey] || ''}
                            isRequired={true}
                            options={embellishmentTypes}
                            handleOnChange={handleChange}>
                        </RitzSelection>
                       <FormErrorMessage message={formErrors?.[embellishmentTypeKey]} />
                    </Box>
                    <Box marginBottom={3}>
                        <InputLabel sx={{ mb: 1 }}>Type:</InputLabel>
                        <RitzSelection
                            id={embellishmentSubTypeKey}
                            name={embellishmentSubTypeKey}
                            optionValue={'id'}
                            optionText={'name'}
                            selectedValue={packItemEMBData?.[embellishmentSubTypeKey] || ''}
                            isRequired={true}
                            options={embellishmentSubTypes}
                            handleOnChange={handleChange}>
                        </RitzSelection>
                        <FormErrorMessage message={formErrors?.[embellishmentSubTypeKey]} />
                    </Box>

                    <Box marginBottom={3}>
                        <InputLabel sx={{ mb: 1 }}>Uploads</InputLabel>
                        <RitzSingleFileUploader
                        displayType={uploadType}
                        selectedFilesParent={selectedvideoDataArray || []} 
                        handleFileChangeParent={(selectedFiles: any) => handleFileChange(selectedFiles)} 
                        filelocation={fileAttacehemtLocation} />
                   
                    </Box>

                    <Box marginBottom={3}>
                        <InputLabel sx={{ marginBottom: 1 }}>Grading:</InputLabel>
                        <Box style={{ display: 'flex', alignItems: 'center' }}>
                            <Switch
                                checked={packItemEMBData.grading === true}
                                onChange={(event) => handleOptionChange(event.target.checked)}
                            />
                        </Box>
                        <FormErrorMessage message={formErrors?.[embellishmentGradingKey]} />
                    </Box>
                    <Box marginBottom={3}>
                        <TableContainer>
                            <Table >
                                <TableHead>
                                    <TableRow sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => theme.palette.grey[50]}}>
                                        <TableCell align="left">Country - Colorway - Item - Size</TableCell>
                                        <TableCell align="center">Embellishment Size</TableCell>
                                        <TableCell align="center">Attachment</TableCell>
                                        <TableCell align="center">Not Applicable</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {embellishmentSizesList.map((size, index) => (
                                        <TableRow
                                            key={size.pack_id}
                                            sx={{
                                                borderTop: (theme) => `${index == 0 ? 2 : 1}px solid ${theme.palette.grey[200]}`,
                                                borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                background: (theme) => size.isChecked ? '#F48484' : theme.palette.grey[50]
                                            }}
                                        >
                                            <TableCell component="th" scope="row">{size?.country_name} - {size.colorway_name} - {size.original?.item_name} [ {size.item_identifier} ] - {size.size_name} </TableCell>
                                            <TableCell align="center"><TextField
                                                name={size.name}
                                                id={size.name}
                                                value={inputEmbSizeValue.find((item) => item.pack_item === size.id)?.size || ''}
                                                onChange={(event) => handleTextFieldChange(event, size.name, size.id )}
                                                disabled={size.isChecked || (!packItemEMBData.grading && index !== 0)}
                                            >
                                            </TextField></TableCell>
                                            <TableCell align="left">
                                                <Box>
                                                    <RitzSingleFileUploader
                                                        displayType={LISTVIEW}
                                                        selectedFilesParent={inputEmbSizeValue.find((item) => item.pack_item === size.id)?.pack_item_embellishment_attachment || []}
                                                        handleFileChangeParent={(selectedFiles: any) => handleFileChangeSize(selectedFiles, size.id)}
                                                        filelocation={fileAttacehemtLocation}
                                                        isReadOnly={size.isChecked || (inputEmbSizeValue.find((item) => item.pack_item === size.id)?.size == null) || (inputEmbSizeValue.find((item) => item.pack_item === size.id)?.size === '')}
                                                    />
                                                  </Box>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Checkbox 
                                                sx={{'&:hover': {backgroundColor: 'transparent'}}} 
                                                checked={size.isChecked|| false}  
                                                onChange={(event: any) => { handleChangeCheckBox(event, size.id) }}
                                                 />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <FormErrorMessage message={formErrors?.[embellishmentSizesKey]} />
                    </Box>
                    <Box sx={{ mt: 5, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={() => handleSaveEmbellishment()} variant="contained" disabled={isSaving}>
                            {isSaving && <SaveSpinner />}Save
                        </Button>
                    </Box>
                </>
            )
        );
    }

    return (
        <RitzModal open={modalOpen} title={"Add/Edit EMB Service"} onClose={() => {setModalOpen(false)}} maxWidth={'lg'}>
            {getEMBPrintForm()}
        </RitzModal>
    );
};

export default EditPackItemEMBService;