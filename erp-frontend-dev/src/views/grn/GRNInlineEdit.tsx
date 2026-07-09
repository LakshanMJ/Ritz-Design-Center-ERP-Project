import FormErrorMessage from '@/components/FormErrorMessage';
import RitzInput from '@/components/Ritz/RitzInput';
import RitzSelection from '@/components/Ritz/RitzSelection';
import {
    TableCell,
    TableRow,
    Typography,
    Box,
    Tooltip
} from '@mui/material';
import React, {useEffect, useRef, useState} from 'react';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import * as RestUrls from '@/helpers/constants/RestUrls';
import CreatableSelect from 'react-select/creatable';
import CheckIcon from '@mui/icons-material/Check';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import * as GrnUrls from '../../helpers/constants/rest_urls/GrnUrls';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import {green, red} from '@mui/material/colors';
import {getDefaultError} from '@/helpers/Utilities';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import api from '@/services/api';
import toast from 'react-hot-toast';
import ReplayIcon from '@mui/icons-material/Replay';


const GRNInlineEditView = ({subRowGRNDetails, subRowGRNHeaders, handleCloseInlineEdit, materialDetailId}: any) => {

    const subRowDeletedAttachments = 'deleted_attachment_ids';
    const batchNumberKey = 'batch_number';
    const valueKey = 'value';
    const displayValueKey = 'display_value';
    const iDKey = 'id';
    const labelKey = 'label';
    const attributeTypeKey = 'attribute_type';
    const dropDownFieldType = 'dropdown';
    const selectOrCreateFieldType = 'dropdown_create';
    const qaInspectionPassedKey = 'qa_inspection_passed';
    const attachmentDetailsKey = 'attachment_details';
    const headerValueKey = 'value';
    const attachmentsKey = 'attachments';

    const [materialDetailData, setMaterialDetailData] = useState<any>({})
    const subFileInputRef = useRef<HTMLInputElement>(null);


    const [errors, setErrors] = useState<any>({});
    const [shadeOptionList, setShadeOptionList] = useState<any>([]);
    const [isUploading, setIsUploading] = useState({state: false, attachmentType: ''});

    useEffect(() => {
        refreshBatchNumbers();
    }, [materialDetailData?.batch_number?.value]);


    const refreshBatchNumbers = () => {
        const batchNumber = materialDetailData?.[batchNumberKey]?.[valueKey];
        if (batchNumber != null) {
            api.get(GrnUrls.shadeListUrl(batchNumber)).then(response => {
                const responseData = response?.data || []
                setShadeOptionList(responseData);
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            });
        }
    }


    useEffect(() => {
        console.log(subRowGRNHeaders)
        setMaterialDetailData({...subRowGRNDetails});
    }, [subRowGRNDetails])


    //handle value changes
    const handleSubRowSelectChanges = (event: any, optionName: number) => {
        const {name, value} = event.target;
        setMaterialDetailData({
            ...materialDetailData,
            [name]: {
                [valueKey]: value,
                [displayValueKey]: optionName
            }
        });
    }

    const handleSubRowInputChanges = (event: any) => {
        const {name, value} = event.target;
        setMaterialDetailData({
            ...materialDetailData,
            [name]: value
        });
    }

    const handleGetOrCreateChanges = (event: any, rowData: any, fieldName: any) => {
        let changedValues;
        if (event['__isNew__']) {
            changedValues = {[valueKey]: null, [displayValueKey]: event[labelKey]}
        } else {
            changedValues = {[valueKey]: event[valueKey], [displayValueKey]: event[labelKey]}
        }
        setMaterialDetailData({
            ...materialDetailData,
            [fieldName]: changedValues
        });
        // if (fieldName == batchNumberKey) {
        //     refreshBatchNumbers();
        // }
    }


    const handleCloseInlineEditChanges = (refreshData: boolean) => {
        handleCloseInlineEdit(refreshData);
    }

    const handleDeleteUndo = (attachmentId: any) => {
        const updatedRowMaterialDetailsCopy = {...materialDetailData};
        const deletedIds = updatedRowMaterialDetailsCopy[subRowDeletedAttachments];
        const index = deletedIds.indexOf(attachmentId, 0);

        if (index > -1) {
            deletedIds.splice(index, 1);
        }
        setMaterialDetailData({...updatedRowMaterialDetailsCopy, [subRowDeletedAttachments]: deletedIds});
    }
    const handleDeleteAttachmentAction = (attachmentId: any) => {
        const updatedRowMaterialDetailsCopy = {...materialDetailData};

        if (!updatedRowMaterialDetailsCopy?.[subRowDeletedAttachments]) {
            updatedRowMaterialDetailsCopy[subRowDeletedAttachments] = [];
        }

        updatedRowMaterialDetailsCopy[subRowDeletedAttachments].push(attachmentId);
        setMaterialDetailData({...updatedRowMaterialDetailsCopy});
    }

    const handleUploadIconClick = () => {
        if (subFileInputRef.current) {
            subFileInputRef.current.click();
        }
    };

    const handleSubAttachmentUpload = (event: any, attachmentType: any) => {
        setIsUploading({state: true, attachmentType: attachmentType});
        const uploadedFiles = event.target.files;
        const fileLocation = 'grn/attachments'; // TODO - change this also
        const files = Array.from(uploadedFiles || []);
        const uploadData = new FormData();
        uploadData.append('location', fileLocation);
        files.forEach((file: any) => {
            uploadData.append('files', file);
        });
        api.post(RestUrls.uploadFileURL(), uploadData)
            .then(resp => {
                console.log("This is 1")
                const responseData = resp?.data || [];
                if (responseData?.length > 0) {
                    const prevStateCopy = {...materialDetailData};
                    prevStateCopy[attachmentDetailsKey] = [...prevStateCopy[attachmentDetailsKey], ...responseData];
                    setMaterialDetailData({...prevStateCopy});
                    console.log(prevStateCopy)
                }

            })
            .catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => {
            setIsUploading({state: false, attachmentType: attachmentType});
        });
    }

    const handleDownload = (filePath: string, fileName: string) => {
        if (!filePath) {
            toast.error("The file cannot be located or is invalid.");
            return;
        }
        const link = document.createElement('a');
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.href = filePath;
        link.download = fileName;
        link.click();
    };

    //grnId
    const handleInlineSaving = () => {
        api.post(GrnUrls.inlineRowDataSaveUrl(materialDetailId), materialDetailData).then(response => {
            const responseData = response?.data || []
            if (responseData) {
                handleCloseInlineEditChanges(true);
                setShadeOptionList([])
                setErrors({});
            }
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            console.log(error?.response?.data?.errors)
            setErrors(error?.response?.data)
        });
    }


    return (
        <TableRow>
            {
                subRowGRNHeaders?.map((header: any, headerIndex: any) => {

                    const optionList = header.value === 'shade' ? shadeOptionList.map((option: any) => ({
                        label: option.display_value,
                        value: option.value
                    })) : header?.dropDownOptions?.map((option: any) => ({
                        label: option.display_value,
                        value: option.value
                    }))
                    return (
                        <TableCell key={`${headerIndex}`} sx={{
                            verticalAlign: header.value === qaInspectionPassedKey ? 'center' : 'top',
                            width: header.value === 'attachments' ? '200px' : `${100 / subRowGRNHeaders.length - 1}%`,
                        }}>
                            {
                                header?.[attributeTypeKey] == selectOrCreateFieldType ? (
                                <CreatableSelect
                                    options={optionList}
                                    value={{
                                            label: materialDetailData?.[header.name]?.[displayValueKey],
                                            value: materialDetailData?.[header.name]?.[valueKey]
                                        }}
                                    onChange={(event: any) => handleGetOrCreateChanges(event, materialDetailData, header.name)}
                                    menuPosition={'fixed'}
                                    isDisabled={header.isReadOnly}
                                    menuPlacement={'auto'}
                                    styles={{
                                        menu: (provided, state) => ({
                                            ...provided,
                                            zIndex: 9999,
                                            maxHeight: '50px !important',
                                        }),
                                        option: (provided, state) => ({
                                            ...provided,
                                            backgroundColor: state.isSelected ? '#E4F1FF' : 'white',
                                            color: 'black',
                                            ':hover': {
                                                backgroundColor: '#F0F0F0',
                                            },
                                        }),
                                        control: (provided) => ({
                                            ...provided,
                                            width: '100px'
                                        }),
                                    }}
                                />
                                ): header?.[attributeTypeKey] == dropDownFieldType ? (
                                    <RitzSelection
                                        fullWidth
                                        id={header.name}
                                        name={header.name}
                                        optionValue={valueKey}
                                        optionText={displayValueKey}
                                        size={'small'}
                                        isReadOnly={header.isReadOnly}
                                        selectedValue={materialDetailData?.[header.name]?.[valueKey] || ''}
                                        options={header.dropDownOptions}
                                        handleOnChange={(event: any) => {
                                            const selectedOption = header.dropDownOptions.find((option: any) => option.value === event.target.value);
                                            const displayValue = selectedOption ? selectedOption.display_value : '';// TODO - move this to the function
                                            handleSubRowSelectChanges(event, displayValue);
                                        }}
                                    />
                            ): header?.[headerValueKey] == qaInspectionPassedKey ? (
                                <Box sx={{display: 'inline-flex', alignItems: 'center'}}>
                                                <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                                                    {materialDetailData?.[header.name] === true ? (
                                                        <CheckIcon fontSize='small' sx={{
                                                            color: green[500],
                                                            borderRadius: '50%',
                                                            border: `1px solid ${green[500]}`
                                                        }} />
                                                    ) : materialDetailData?.[header.name] === false ? (
                                                        <ClearIcon fontSize='small' sx={{
                                                            color: red[500],
                                                            borderRadius: '50%',
                                                            border: `1px solid ${red[500]}`
                                                        }} />
                                                    ) : materialDetailData?.[header.name] === null ? (
                                                        <span />
                                                    ) : (
                                                        <span />
                                                    )}
                                                </Box>

                                </Box>
                            ):  header?.[headerValueKey] === 'attachments' ? (
                                materialDetailData?.[attachmentDetailsKey]?.length > 0 ? (
                                    <>
                                        {materialDetailData?.[attachmentDetailsKey].map((attachment: any, attachmentIndex: any) => (
                                            <React.Fragment key={attachmentIndex}>
                                                {attachment?.['display_name'] !== '' &&
                                                    <Box key={attachmentIndex}
                                                         sx={{
                                                             display: 'flex',
                                                             alignItems: 'center',
                                                             mt: 1
                                                         }}>
                                                        <Tooltip title="Delete" arrow>
                                                            {
                                                                materialDetailData?.[subRowDeletedAttachments]?.includes(attachment?.[iDKey]) ? (
                                                                        <ReplayIcon
                                                                            color="success"
                                                                            onClick={() => handleDeleteUndo(attachment?.[iDKey])}
                                                                        />
                                                                    ): (
                                                                        <DeleteOutlineIcon
                                                                            color="error"
                                                                            sx={{
                                                                                verticalAlign: 'middle',
                                                                                fontSize: '20px',
                                                                                cursor: 'pointer'
                                                                            }}
                                                                            onClick={() => handleDeleteAttachmentAction(attachment?.[iDKey])}
                                                                        />
                                                                )
                                                            }

                                                        </Tooltip>
                                                        <Tooltip title="Download" arrow>
                                                            <FileDownloadIcon
                                                                color="primary"
                                                                sx={{
                                                                    marginLeft: '0.1rem',
                                                                    verticalAlign: 'middle',
                                                                    fontSize: '20px',
                                                                    cursor: 'pointer'
                                                                }}
                                                                onClick={() => handleDownload(attachment?.['file_path'], attachment?.['display_name'])}
                                                            />
                                                        </Tooltip>
                                                        <Typography key={attachmentIndex} sx={{
                                                            marginLeft: '0.5rem',
                                                            wordBreak: 'break-all',
                                                            width: '300px'
                                                        }}>
                                                            {attachment['display_name']}
                                                        </Typography>
                                                    </Box>}
                                            </React.Fragment>
                                        ))}
                                    </>
                                ) : (
                                    <Typography>--</Typography>
                                )
                            ): (
                                <RitzInput
                                  name={header.name}
                                  id={header.name}
                                  selectedValue={materialDetailData?.[header.name] || ""}
                                  size={'small'}
                                  isReadOnly={header.isReadOnly}
                                  inputType={'text'}
                                  fullWidth
                                  handleOnChange={(event: any) => handleSubRowInputChanges(event)}
                                />
                            )
                            }
                            <FormErrorMessage message={errors?.errors?.[header.value]}/>
                        </TableCell>
                    )
                })
            }
            <TableCell sx={{verticalAlign: 'center'}}>
                <Box sx={{display: 'flex', flexDirection: 'row', justifyContent: 'end'}}>
                    <Tooltip title="Save" arrow>
                        <SaveIcon
                            color="success"
                            sx={{
                                marginLeft: '0.1rem',
                                verticalAlign: 'middle',
                                fontSize: '20px',
                                cursor: 'pointer'
                            }}
                            onClick={() => handleInlineSaving()}
                        />
                    </Tooltip>
                    <input
                        type="file"
                        ref={subFileInputRef}
                        style={{display: 'none'}}
                        onChange={(event) => handleSubAttachmentUpload(event, attachmentsKey)}
                    />
                    <Tooltip title="Upload Attachment" arrow>
                        <UploadFileIcon
                            color="primary"
                            sx={{
                                marginLeft: '0.1rem',
                                verticalAlign: 'middle',
                                fontSize: '20px',
                                cursor: 'pointer'
                            }}
                            onClick={handleUploadIconClick}
                        />
                    </Tooltip>
                    <Tooltip title="Cancel" arrow>
                        <HighlightOffIcon
                            color="error"
                            sx={{
                                marginLeft: '0.1rem',
                                verticalAlign: 'middle',
                                fontSize: '20px',
                                cursor: 'pointer'
                            }}
                            onClick={() => handleCloseInlineEditChanges(false)}
                        />
                    </Tooltip>
                </Box>
            </TableCell>
        </TableRow>
    )
}

export default GRNInlineEditView;
