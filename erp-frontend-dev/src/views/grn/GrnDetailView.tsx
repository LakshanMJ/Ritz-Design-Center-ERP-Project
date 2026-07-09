import api from '@/services/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';
import SaveSpinner from '@/components/SaveSpinner';
import RitzTable from '@/components/Ritz/RitzTable';
import GrnRowDetailsView from './GrnRowDetailsView';
import RitzModal from '@/components/Ritz/RitzModal';
import RitzInput from '@/components/Ritz/RitzInput';
import { getDefaultError, hasRole } from '@/helpers/Utilities';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import DefaultLoader from '@/components/DefaultLoader';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import * as RestUrls from '@/helpers/constants/RestUrls';
import React, { useEffect, useRef, useState } from 'react';
import { IndeterminateCheckBox } from '@mui/icons-material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import RitzSelection from '@/components/Ritz/RitzSelection';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import * as GrnUrls from '../../helpers/constants/rest_urls/GrnUrls';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import { createdGrnDetailsPageURL } from '@/helpers/constants/front_end/GrnUrls';
import { Alert, Box, Button, Card, Checkbox, CircularProgress, Dialog, DialogContent, DialogTitle, Grid, IconButton, InputLabel, Link, ListItem, ListItemText, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import { TabContext } from '@mui/lab';
import { RitzTabPanel, RitzTabs } from '@/components/Ritz/RitzTabs';
import POClubBom from '../purchase_order/club/POClubBom';
import POBom from '../purchase_order/POBom';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import ShadeGroups from '@/views/grn/ShadeGroups';
import ShadeGroupsSummary from '@/views/grn/ShadeGroupsSummary';
import GrnFabricSummary from './GrnFabricSummary';
import FabricInspection from '@/views/grn/FabricInspection';
import GRNQRcodes from '@/views/grn/GRNQRcodes';
import InspectionReport from '@/views/grn/InspectionReport';
import { grey, red } from '@mui/material/colors';
import CircularLoader from '@/components/CircularLoader';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CloseIcon from '@mui/icons-material/Close';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import SupplierPoDetails from './SupplierPoDetails';
import RitzMultipleFileUploader from '@/components/Ritz/RitzMultipleFileUploader';
import { LISTVIEW } from '@/helpers/constants/FileUpload';
import BomDetails from './BomDetails';
import DDQDetails from './DDQDetails';
import DDQIDetails from './DDQI Details';
import RitzSingleFileUploader from '@/components/Ritz/RitzSingleFileUploader';
import FabricShrinkage from './FabricShrinkage';
import RitzMultiSelectCheckBox from '@/components/Ritz/RitzMultiSelectCheckBox';
import { generalPurchaseOrderDetailsPageURL, purchaseOrderClubDetailsPageURL } from '@/helpers/constants/front_end/POUrls';
import NextLink from 'next/link';
import GeneralPOBomDetails from './GeneralPOBomDetails';
import POClubShadeMapping from './POClubShadeMapping';
import { GRN_ADMIN } from '@/helpers/constants/RoleManager';
import { CANCEL_STATE, COMPLETE_STATE, DRAFT_STATE, FABRIC_INSPECTION_STATE, GRN_DRAFT_STATE, GRN_VERIFICATION, QA_VERIFICATION_STATE, QUANTITY_VERIFICATION_STATE } from '@/helpers/constants/GrnStates';
import GrnAdjustment from './GrnAdjustment';
import RitzBreadcrumbs from '@/components/Ritz/RitzBreadcrumbs';
import { grnStateChangeURL, plantWarehouseListURL } from '../../helpers/constants/rest_urls/GrnUrls';
import CheckIcon from '@mui/icons-material/Check';
import VerifiedIcon from '@mui/icons-material/Verified';
import SendIcon from '@mui/icons-material/Send';
import { RitzTabPanelWithParams, RitzTabsWithParams } from '@/components/Ritz/RitzTabsWithParams';
import { ReactKeyHelper } from '@/helpers/KeyHelper';


const GrnDetailView = ({ grnId, supplierPo }: any) => {
  const fileAttacehemtLocation = `grn/other_attachments`;
  const idKey = 'id';
  const stateKey = 'state';
  const remarksKey = 'remarks';
  const createdKey = 'created';
  const grnHeadersKey = 'grn_headers';
  const deletingTypeKey = 'deletingType';
  const supplierNameKey = 'supplier_name';
  const supplierPoIdKey = 'supplier_po_id';
  const invoiceNumberKey = 'invoice_number';
  const confirmedDeliveryDateKey = 'confirmed_delivery_date'
  const materialHeadersKey = 'material_headers';
  const deleteModalStateKey = 'deleteModalOpened';
  const supplierPoNumberKey = 'supplier_po_number';
  const supplierDeliveryDateKey = 'supplier_delivery_date';
  const selectedDeletingIdKey = 'selectedDeletingId';
  const packListAttachmentKey = 'pack_list_attachment';
  const grnMaterialDetailsKey = 'supplierpogrnmaterialdetail_set';
  const supplierPoGrnMaterialSetKey = 'supplierpogrnmaterial_set';
  const selectedGrnMaterialIndexKey = 'selectedGrnMaterialIndex';
  const packListAttachmentDetailsKey = 'pack_list_attachment_details';
  const packListAttachmentDetailKey = 'pack_list_attachment_detail';
  const invoiceAttachmentDetailKey = 'invoice_attachment_detail';
  const commercialInvoiceAttachmentKey = 'commercial_invoice_attachment';
  const materialPackListAttachmentIdKey = 'material_pack_list_attachment';
  const deletePackListAttachmentIdKey = 'delete_pack_list_attachment_ids';
  const materialPackListAttachmentDetailsKey = 'material_pack_list_attachment_details';
  const commercialInvoiceAttachmentDetailsKey = 'commercial_invoice_attachment_details';
  const deleteMaterialPackListAttachmentIdKey = 'delete_material_pack_list_attachment_id';
  const deleteCommercialInvoiceAttachmentIdKey = 'delete_commercial_invoice_attachment_ids';
  const clubIdKey = 'club_id';
  const purchaseOrderIdsKey = 'purchase_orders';
  const fabricTypeKey = 'fabric'
  const deliveryDatesKey = 'supplierdeliverydate_set'
  const grnPriceKey = 'grn_price'
  const attachmentsKey = 'attachments'
  const replacementGrnsKey = 'replacement_grns'
  const poClubDisplayKey = 'club_display_number'
  const supplierMaterialCodeId = 'pk_supplier_material_code_id';
  const generalPoDisplayNumberKey = 'general_po_display_number';
  const generalPoIdKey = 'general_po_id'

  const tabDisplayOrderKey = 'tabDisplayOrder';
  const tabLabel = 'tabLabel';
  const grnDetailsTabKey = 'grn_details';
  const fabricInspectionTabKey = 'inspection';
  const shadeMappingTabKey = 'po_shade_mapping';
  const shrinkageTabKey = 'shrinkage';
  const reportsTabKey = 'reports';
  const ddqTabKey = 'ddq';
  const ddqiTabKey = 'ddqi';
  const grnVerificationTabKey = 'grn_verification';

  const grnTabs = {
    [grnDetailsTabKey]: { [tabDisplayOrderKey]: '1', [tabLabel]: 'GRN Details' },
    [fabricInspectionTabKey]: { [tabDisplayOrderKey]: '2', [tabLabel]: 'Fabric Inspection' },
    [shrinkageTabKey]: { [tabDisplayOrderKey]: '3', [tabLabel]: 'Shrinkage' },
    [shadeMappingTabKey]: { [tabDisplayOrderKey]: '4', [tabLabel]: 'Shade Mapping' },
    [reportsTabKey]: { [tabDisplayOrderKey]: '5', [tabLabel]: 'Reports' },
    [ddqTabKey]: { [tabDisplayOrderKey]: '6', [tabLabel]: 'DDQ' },
    [ddqiTabKey]: { [tabDisplayOrderKey]: '7', [tabLabel]: 'DDQI' },
    [grnVerificationTabKey]: { [tabDisplayOrderKey]: '8', [tabLabel]: 'GRN Verification' }} as any;

  const getTabData = (key: any) => ({ value: grnTabs[key][tabDisplayOrderKey], label: grnTabs[key][tabLabel] });

  const initialTabs = [getTabData(grnDetailsTabKey)];

  const removedFabricTabs = [getTabData(reportsTabKey), getTabData(ddqTabKey), getTabData(ddqiTabKey), getTabData(grnVerificationTabKey)];

  const quantityVerificationTabs = [getTabData(ddqTabKey)];

  const commonVerificationTabs = [getTabData(fabricInspectionTabKey), getTabData(shrinkageTabKey), getTabData(shadeMappingTabKey), getTabData(reportsTabKey), getTabData(ddqTabKey),];

  const qaVerificationTabs = [...commonVerificationTabs, getTabData(ddqiTabKey)];

  const completeTabs = [...qaVerificationTabs, getTabData(grnVerificationTabKey)];

  const [grnSummaryTabs, setGrnSummaryTabs] = useState([...initialTabs]);
  interface GrnDetails {
    [idKey]: number;
    [stateKey]: string;
    [remarksKey]: string;
    [createdKey]: string;
    [supplierNameKey]: string;
    [supplierPoIdKey]: string;
    [supplierPoIdKey]: string;
    [supplierPoIdKey]: string;
    [invoiceNumberKey]: string;
    [supplierPoNumberKey]: number;
    [packListAttachmentKey]: number;
    [commercialInvoiceAttachmentKey]: number;
    [grnHeadersKey]: any[];
    [grnHeadersKey]: any[];
    [materialHeadersKey]: any[];
    [supplierPoGrnMaterialSetKey]: any[];
    [packListAttachmentDetailsKey]: any[];
    [packListAttachmentDetailKey]: string;
    [invoiceAttachmentDetailKey]: string;
    [deletePackListAttachmentIdKey]: any[]
    [deleteCommercialInvoiceAttachmentIdKey]: any[]
    [commercialInvoiceAttachmentDetailsKey]: any[];
    [clubIdKey]: number;
    [purchaseOrderIdsKey]: any[];
    [deliveryDatesKey]: any[],
    [grnPriceKey]: number;
    [attachmentsKey]: any[];
    [replacementGrnsKey]: any[];
    [poClubDisplayKey]: any[];
    [generalPoDisplayNumberKey]: string[];
    [generalPoIdKey]: number[]

  }

  const router = useRouter();
  const keyHelper = new ReactKeyHelper();
  const [isSaving, setIsSaving] = useState(false);
  const [isAllRowsCollapse, setIsAllRowsCollapse] = useState(true);
  const [isTableRefresh, setIsTableRefresh] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stateOption, setStateOption] = useState<any>([]);
  const [supplierPoList, setSupplierPoList] = useState([]);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [SelectedRowData, setSelectedRowData] = useState({ header: '', index: 0 });
  const [selectedSubRowId, setSelectedSubRowId] = useState(null)
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [selectedData, setSelectedData] = useState({ [supplierPoNumberKey]: 0, [supplierDeliveryDateKey]: 0, [invoiceNumberKey]: 0, [packListAttachmentDetailKey]: 0 });
  const [isMainMaterialRow, setIsMainMaterialRow] = useState(true);
  const [materialMetaData, setMaterialMetaData] = useState<any>([]);
  const [isEnableSubRowEdit, setIsEnableSubRowEdit] = useState(false);
  const [filteredMaterials, setFilteredMaterials] = useState<any>([]);
  const [currentDate] = useState(new Date().toISOString().slice(0, 10));
  const [isMaterialAssigning, setIsMaterialAssigning] = useState(false);
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(true);
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState({ state: false, attachmentType: '' });
  const [createdGrnDetails, setCreatedGrnDetails] = useState<GrnDetails | any>(null);
  const [generalFileAttachments, setGeneralFileAttachments] = useState({ [commercialInvoiceAttachmentDetailsKey]: [], [packListAttachmentDetailsKey]: [] });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState({ [deleteModalStateKey]: false, [selectedGrnMaterialIndexKey]: null, [selectedDeletingIdKey]: null, [deletingTypeKey]: '' });
  const [selectedMaterialId, setSelectedMaterialId] = useState(0);
  const [selectedSupplierMaterialCodeId, setSelectedSupplierMaterialCodeId] = useState(0);
  const [loader, setLoader] = useState(false);
  const [editStatusData, setEditStatusData] = useState({});
  const [grnErrors, setGrnErrors] = useState({});
  const [showErrorsModal, setShowErrorsModal] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState<any>([]);
  const [packListData, setPackListData] = useState<any>([]);
  const [clubDetails, setClubDetails] = useState<any>({ club_id: null, club_display_number: null, purchase_orders: [] });
  const [replacementGrns, setReplacementGrns] = useState<any>([]);
  const [activeReportTab, setActiveSequenceTypeTab] = useState<any>('bom');
  const [warehouseList, setWarehouseList] = useState([]);
  const [isChangeState, setIsChangeState] = useState<any>(false)
  const [openStateChangeModal, setOpenStateChangeModal] = useState(false);
  const canEdit = hasRole(GRN_ADMIN);
  console.log('grnErrors', grnErrors)
  const reportsTabs = [
    { label: 'BOM', value: 'bom', key: 1 },
    { label: 'QR Codes', value: 'qr_codes', key: 2 },
    ...(createdGrnDetails?.is_include_fabric_material
      ? [
          { label: 'Fabric Summary', value: 'fabric_report', key: 3 },
          { label: 'Inspection Report', value: 'inspection_report', key: 4 },
          { label: 'Shade Summary', value: 'shade_summary', key: 5 },
        ]
      : []),
  ];
  //handling values
  const handleSelectedGeneralData = (event: any) => {
    setSelectedMaterials([])

    if (event.target.name === supplierPoNumberKey) {
      setPackListData([])
      setInvoiceDetails([])
      setSelectedInvoiceData({})
      setSelectedDeliveryNote({ delivery_note: null })
      setExpectedDeliveryDatesList([])
      setSelectedPackListData({})
      setSelectedData(prev => ({
        [supplierPoNumberKey]: 0,
        [supplierDeliveryDateKey]: 0,
        [invoiceNumberKey]: 0,
        [packListAttachmentDetailKey]: 0,
        [invoiceAttachmentDetailKey]: 0
      }));

    }

    if (event.target.name === supplierDeliveryDateKey) {
      // setFilteredMaterials([]);
      setSelectedData(prev => ({
        ...prev,
        [packListAttachmentDetailKey]: 0
      }));
    }

    if (event.target.name === invoiceNumberKey) {
      // setFilteredMaterials([]);
      setSelectedData(prev => ({
        ...prev,
        [packListAttachmentDetailKey]: 0
      }));
    }
    setSelectedData(prev => ({
      ...prev,
      [event.target.name]: event.target.value
    }));
  }

  const handleMetaDataValueChange = (event: any) => {
    const { name, value } = event.target
    setCreatedGrnDetails({
      ...createdGrnDetails,
      [name]: value,
    });
  };
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

  const handleDeleteModelOpen = (materialId: any, selectedId: any, type: any) => {
    setIsDeleteModalOpen({ [deleteModalStateKey]: true, [selectedGrnMaterialIndexKey]: materialId, [selectedDeletingIdKey]: selectedId, [deletingTypeKey]: type })
  }

  const handleDeleteModelClose = () => {
    setIsDeleting(false)
    setIsDeleteModalOpen({ [deleteModalStateKey]: false, [selectedGrnMaterialIndexKey]: null, [selectedDeletingIdKey]: null, [deletingTypeKey]: '' })
  }

  const handleAddMaterialModaClose = () => {
    setIsAddMaterialModalOpen(false)
  }

  const handleAddMaterialModaOpen = () => {
    setIsAddMaterialModalOpen(true)
    setSelectedMaterials([])
    api.get(GrnUrls.unassignedMaterialList(grnId, createdGrnDetails[supplierPoIdKey])).then(resp => {
      const response = resp.data || []
      const materialDetailsValues = response.materials
      setFilteredMaterials(materialDetailsValues)
      setMaterialMetaData(response)
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    })
  }

  const handleMaterialRowOnChange = (event: any, rowIndex: any, headerName: any) => {
    setSelectedRowId(rowIndex)
    setIsMainMaterialRow(true)
    setSelectedRowData({ header: headerName, index: rowIndex })

    const { name, value } = event.target;
    const updatedGrnDetails = { ...createdGrnDetails };
    const updatedMaterialSet = [...updatedGrnDetails.supplierpogrnmaterial_set];
    updatedMaterialSet[rowIndex] = {
      ...updatedMaterialSet[rowIndex],
      [name]: value,
    };

    setCreatedGrnDetails({
      ...updatedGrnDetails,
      supplierpogrnmaterial_set: updatedMaterialSet,
    });
  }

  const handleDeleteAction = () => {
    setIsDeleting(true)
    try {
      if (isDeleteModalOpen?.[deletingTypeKey] === 'pack_list_attachment') {
        if (grnId === 0) {
          setGeneralFileAttachments(prevState => {
            if (prevState.pack_list_attachment_details) {
              prevState.pack_list_attachment_details = prevState.pack_list_attachment_details.filter(detail => detail.id !== isDeleteModalOpen?.[selectedDeletingIdKey]);
            }
            return { ...prevState };
          });
        } else {
          setCreatedGrnDetails((prevState: any) => {
            if (prevState.pack_list_attachment_details) {
              prevState.pack_list_attachment_details = prevState.pack_list_attachment_details.filter((detail: any) => detail.id !== isDeleteModalOpen?.[selectedDeletingIdKey]);
            }
            return { ...prevState };
          });
          setCreatedGrnDetails((prevState: any) => ({
            ...prevState,
            [deletePackListAttachmentIdKey]: [...(prevState?.[deletePackListAttachmentIdKey] || []), isDeleteModalOpen?.[selectedDeletingIdKey]]
          }));
        }
      } else if (isDeleteModalOpen?.[deletingTypeKey] === 'commercial_invoice_attachment') {
        if (grnId === 0) {
          setGeneralFileAttachments(prevState => {
            if (prevState.commercial_invoice_attachment_details) {
              prevState.commercial_invoice_attachment_details = prevState.commercial_invoice_attachment_details.filter(detail => detail.id !== isDeleteModalOpen?.[selectedDeletingIdKey]);
            }
            return { ...prevState };
          });
        } else {
          setCreatedGrnDetails((prevState: any) => {
            if (prevState.commercial_invoice_attachment_details) {
              prevState.commercial_invoice_attachment_details = prevState.commercial_invoice_attachment_details.filter((detail: any) => detail.id !== isDeleteModalOpen?.[selectedDeletingIdKey]);
            }
            return { ...prevState };
          });
          setCreatedGrnDetails((prevState: any) => ({
            ...prevState,
            [deleteCommercialInvoiceAttachmentIdKey]: [...(prevState?.[deleteCommercialInvoiceAttachmentIdKey] || []), isDeleteModalOpen?.[selectedDeletingIdKey]]
          }));
        }
      } else if (isDeleteModalOpen?.[deletingTypeKey] === 'material_attachments') {
        setCreatedGrnDetails((prevState: any) => {
          if (
            prevState.supplierpogrnmaterial_set &&
            prevState.supplierpogrnmaterial_set[isDeleteModalOpen?.[selectedGrnMaterialIndexKey]] &&
            prevState.supplierpogrnmaterial_set[isDeleteModalOpen?.[selectedGrnMaterialIndexKey]].material_pack_list_attachment_details
          ) {
            const materialSet =
              prevState.supplierpogrnmaterial_set[isDeleteModalOpen?.[selectedGrnMaterialIndexKey]];

            materialSet.material_pack_list_attachment_details = null;
            materialSet[deleteMaterialPackListAttachmentIdKey] = isDeleteModalOpen?.[selectedDeletingIdKey]
              ? isDeleteModalOpen?.[selectedDeletingIdKey]
              : null;
          }
          return { ...prevState };
        });


      } else if (isDeleteModalOpen?.[deletingTypeKey] === 'row') {
        handleDeleteRow()
      }
    } finally {
      setIsDeleting(false)
      setIsDeleteModalOpen({ [deleteModalStateKey]: false, [selectedGrnMaterialIndexKey]: null, [selectedDeletingIdKey]: null, [deletingTypeKey]: '' })
    }
  }

  const handleDeleteRow = () => {
    api.delete(GrnUrls.materialRowDeleteUrl(isDeleteModalOpen?.[selectedGrnMaterialIndexKey])).then(response => {
      toast.success(DEFAULT_SUCCESS)
      fetchData()
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    })
  }

  //table definings
  // const customerBrandMaterialIds: number[] = materialMetaData.materials?.map((material: any) => material.customer_brand_material_id) ?? [];
  const handleAllMaterialSelect = () => {
    if (filteredMaterials?.length === selectedMaterials.length) {
      setSelectedMaterials([]);
    } else {
      const supplierMaterialIds = filteredMaterials?.map((material: any) => material?.[supplierMaterialCodeId]) ?? [];
      setSelectedMaterials([...supplierMaterialIds]);
    }
  }

  const handleSingleCheckboxClick = (materialId: number) => {
    const index = selectedMaterials.indexOf(materialId);
    if (index === -1) {
      setSelectedMaterials([...selectedMaterials, materialId]);
    } else {
      const updatedMaterials = [...selectedMaterials];
      updatedMaterials.splice(index, 1);
      setSelectedMaterials(updatedMaterials);
    }
  };

  const supplierPOMaterilas = [
    filteredMaterials?.length > 0 && {
      accessorKey: "id",
      header: (
        <Checkbox
          checkedIcon={<IndeterminateCheckBox />}
          checked={materialMetaData?.materials?.length === selectedMaterials.length}
          onClick={() => handleAllMaterialSelect()}
        />
      ),
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: (props: any) => (
        <Checkbox
          checked={selectedMaterials.indexOf(props?.row?.original?.[supplierMaterialCodeId]) >= 0}
          onClick={() => handleSingleCheckboxClick(props?.row?.original?.[supplierMaterialCodeId])}
        />
      ),
      meta: {
        align: 'center',
        width: 10
      }
    },
    {
      accessorKey: 'material_label',
      header: 'Material',
    },

    {
      accessorKey: 'supplier_material_reference_code',
      header: 'Supplier Reference Code',
    },
    {
      accessorKey: 'ritz_customer_brand_reference_code',
      header: 'Ritz Reference Code',
    },
    {
      accessorKey: 'reference_code',
      header: 'Customer Reference Code',
    },
    {
      accessorKey: 'name',
      header: 'Material Details',
      cell: (props: any) => (
        <Typography>--</Typography>
      ),
    },
  ].filter(Boolean);

  const renderMaterialDetails = () => {
    return (
      <RitzTable
        columns={supplierPOMaterilas}
        data={filteredMaterials} />
    )
  }

  const materialHeaders = createdGrnDetails?.[grnHeadersKey] || [];

  const MaterialDataColumns = materialHeaders.map((header: any, index: any) => {
    return {
      accessorFn: (row: any) => row?.material_details?.[header.name],
      enableSorting: header.value === 'material_pack_list_attachment' ? false : true,
      header: header.label,
      cell: (props: any) => {
        const rowData = props?.row?.original;
        const value = rowData?.material_details[header.name];
        if (header.value === 'material_pack_list_attachment') {
          const attachmentDetails = props?.row?.original?.[materialPackListAttachmentDetailsKey]

          return (
            <>
              {isUploading.state === true && isUploading.attachmentType === materialPackListAttachmentIdKey && selectedRowId === props?.row?.index ?
                (<Box sx={{ display: 'flex', flexDirection: 'row', mt: 1 }}><CircularProgress size={20} /><Typography color='primary' sx={{ fontWeight: '500', ml: 1 }}>File Is Uploading...</Typography></Box>) : (
                  <>
                    {attachmentDetails && Object.keys(attachmentDetails).length > 0 ? <Box sx={{ display: 'flex', alignItems: 'right', mt: 1 }}>
                      <Tooltip title="Delete" arrow>
                        <DeleteOutlineIcon
                          color="error"
                          sx={{ verticalAlign: 'middle', fontSize: '20px', cursor: 'pointer' }}
                          onClick={() => handleDeleteModelOpen(props?.row?.index, attachmentDetails?.['id'], 'material_attachments')}
                        />
                      </Tooltip>
                      <Tooltip title="Download" arrow>
                        <FileDownloadIcon
                          color="primary"
                          sx={{ marginLeft: '0.1rem', verticalAlign: 'middle', fontSize: '20px', cursor: 'pointer' }}
                          onClick={() => handleDownload(attachmentDetails?.['file_path'], attachmentDetails?.['display_name'])}
                        />
                      </Tooltip>
                      <Typography sx={{ marginLeft: '0.5rem', wordBreak: 'break-all', width: '300px' }}>
                        {attachmentDetails?.['display_name']}
                      </Typography>
                    </Box> : <Typography>--</Typography>}
                  </>
                )}
            </>
          );
        } else if (header.value === 'total_expected_quantity' || header.value === 'grn_price') {
          const shouldAutofocus = header.value === SelectedRowData?.header && props?.row?.index === SelectedRowData?.index && isMainMaterialRow;

          return (
            <>
              <RitzInput
                name={header.name}
                handleAutoFocus={shouldAutofocus}
                id={header.name}
                selectedValue={props.row?.original?.[header.name] || null}
                size={'small'}
                inputType={header.attribute_type === 'decimal' || header.attribute_type === 'integer' ? 'number' : 'text'}
                fullWidth
                isReadOnly={createdGrnDetails?.state === COMPLETE_STATE}
                handleOnChange={(event: any) => handleMaterialRowOnChange(event, props?.row?.index, header.value)} />
            </>
          )
        } else if (header.value === 'total_expected_quantity_units') {
          return (
            <>
              <RitzSelection
                fullWidth
                id={header.name}
                name={header.name}
                optionValue={'value'}
                optionText={'display_value'}
                size={'small'}
                isReadOnly={createdGrnDetails?.state === COMPLETE_STATE}
                selectedValue={props.row?.original?.[header.name] || ''}
                options={header.dropDownOptions}
                handleOnChange={(event: any) => handleMaterialRowOnChange(event, props?.row?.index, header.value)} />
            </>
          )
        } else {
          return <Typography>{value || '--'}</Typography>;
        }
      },
      meta: {
        width: header.value === 'attachments' ? 300 : 'auto'
      }
    };
  });

  const updatedMaterialColumns = [
    {
      accessorKey: "id",
      header: '',
      cell: ({ row }: any) => (
        <span style={{ paddingLeft: `${row.depth * 2}rem` }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton
              size="small"
              onClick={() => handleRowExpand(row)}
              style={{ cursor: "pointer" }}
            >
              {row.getIsExpanded() ? (
                <KeyboardArrowDownIcon />
              ) : (
                <KeyboardArrowRightIcon />
              )}
            </IconButton>
          </Box>
        </span>
      ),
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      meta: {
        align: "left",
      },
    },
    ...MaterialDataColumns,
    {
      accessorKey: "id",
      header: '',
      cell: ({ row }: any) => {
        const fileInputRef = useRef<HTMLInputElement>(null);
        const handleIconClick = () => {
          if (fileInputRef.current) {
            fileInputRef.current.click();
          }
        };

        const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
          handleMaterialFileUpload(event, 'material_pack_list_attachment', row.index, row?.original?.id);
        };

        return (
          <>
            <Box sx={{ width: '120px' }}>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <Tooltip title="Upload Attachment" arrow>
                <UploadFileIcon
                  color="primary"
                  sx={{ marginLeft: '0.1rem', verticalAlign: 'middle', fontSize: '20px', cursor: 'pointer' }}
                  onClick={handleIconClick}
                />
              </Tooltip>
              <Tooltip title="Download Template" arrow>
                <FileCopyIcon
                  color="success"
                  fontSize='small'
                  sx={{ marginLeft: '0.1rem', verticalAlign: 'middle', fontSize: '20px', cursor: 'pointer' }}
                  onClick={() => handleTemplateDownload(row?.original?.id, row?.original?.material_details?.material_type)}
                />
              </Tooltip>
              <Tooltip title="Download QR">
                <QrCode2Icon
                  color="secondary"
                  sx={{ marginLeft: '0.1rem', verticalAlign: 'middle', fontSize: '20px', cursor: 'pointer' }}
                  onClick={() => handleQrCodeGenerate(row?.original?.id, row?.original?.material_details?.material_type)}
                />
              </Tooltip>
              {row?.original?.material_details.material_type == fabricTypeKey && <Tooltip title="Shade Groups" arrow>
                <ImageSearchIcon
                  color="primary"
                  fontSize='small'
                  sx={{ marginLeft: '0.1rem', verticalAlign: 'middle', fontSize: '20px', cursor: 'pointer' }}
                  onClick={() => handleOpenShadeGroupModal(row?.original?.material_details?.[supplierMaterialCodeId], row?.original?.id)}
                />
              </Tooltip>}


              {createdGrnDetails.state == 'draft' && <Tooltip title="Delete Material" arrow>
                <DeleteOutlineIcon
                  color="error"
                  sx={{ verticalAlign: 'middle', fontSize: '20px', cursor: 'pointer' }}
                  onClick={() => handleDeleteModelOpen(row?.original?.id, 0, 'row')}
                />
              </Tooltip>}
            </Box>
          </>
        )
      },
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      meta: {
        align: "right",
        width: 150
      },
    }
  ];

  const getRowCanExpand = (row: any) => {
    const subRows = row?.original?.subRows || [];
    return subRows.length > 0;
  };

  const handleRowExpand = (row: any) => {
    row.toggleExpanded();
  }

  const newRowAction = (status: any, index: any, headers: any) => {
    if (createdGrnDetails) {
      const updatedGrnDetails = { ...createdGrnDetails };
      const material = updatedGrnDetails.supplierpogrnmaterial_set[index];
      if (material) {
        const newMaterialDetail = { ...headers };
        material.supplierpogrnmaterialdetail_set.push(newMaterialDetail);
        setCreatedGrnDetails(updatedGrnDetails);
      }
    }
  }

  const handleRowRefresh = (needRefresh: boolean) => {
    if (needRefresh) {
      setIsAllRowsCollapse(false)
      fetchData()
    }
  }

  const handleUnsavedRowClean = (rowIndex: number, subRowIndex: number) => {
    if (createdGrnDetails) {
      const updatedGrnDetails = { ...createdGrnDetails };
      const material = updatedGrnDetails.supplierpogrnmaterial_set[rowIndex];
      if (material) {
        const updatedMaterialDetails = material.supplierpogrnmaterialdetail_set.filter((detail: any, index: number) => index !== subRowIndex);
        material.supplierpogrnmaterialdetail_set = updatedMaterialDetails;
      }
      setCreatedGrnDetails(updatedGrnDetails);
      fetchData()
    }
  }
  const handleAddNewSubRow = (rowData: any, headers: any) => {
    setShowRemoveConfirmation(false)
    const rowIndex = rowData?.row?.index
    const materialId = rowIndex?.original?.id
    let newMaterialDetails: any = {
      id: null,
      grn_material: materialId
    };

    headers.forEach((header: any) => {
      const value = header.attribute_type === "boolean" ? true : null;
      newMaterialDetails[header.name] = value;
    });

    if (createdGrnDetails) {
      const updatedGrnDetails = { ...createdGrnDetails };
      const material = updatedGrnDetails.supplierpogrnmaterial_set[rowIndex];
      if (material) {
        const newMaterialDetail = { ...newMaterialDetails };
        material.supplierpogrnmaterialdetail_set.push(newMaterialDetail);
        setCreatedGrnDetails(updatedGrnDetails);
      }
    }
  };

  const handleEditStatus = (data: any) => {
    setEditStatusData(data)
  }

  const renderSubRow = ({ row }: any) => {
    const subRowDetails = row?.row?.original?.[grnMaterialDetailsKey]
    const subRowHeaders = row?.row?.original?.[materialHeadersKey].filter((header: { is_visible: any; }) => header.is_visible);
    if (subRowDetails.length === 0) {
      handleAddNewSubRow(row, subRowHeaders);// This is causing an console error. It's okay for now.
    }
    return <GrnRowDetailsView grnId={grnId} rowData={row} currentState={createdGrnDetails.state} setNewRow={newRowAction} setToRefreshData={handleRowRefresh} setUnsavedRowClean={handleUnsavedRowClean} editStatus={handleEditStatus} />
  }

  //api calls
  const fetchData = () => {
    setLoader(true)
    if (grnId != undefined) {
      const requests = [
        api.get(GrnUrls.grnMetaDataURL()),
        api.get(plantWarehouseListURL()),
      ];

      if (grnId > 0) {
        requests.push(
          api.get(GrnUrls.grnMaterialDetailsURL(grnId)),
          api.get(GrnUrls.replacementsGRNsURL(grnId))
        );
      }

      Promise.all(requests).then(resp => {
        const response = resp.map((r: any) => r.data);
        const [grnMetadataDetails, warehouseList, createdGrnData, replacementGrns] = response;
        setCreatedGrnDetails(createdGrnData)
        setReplacementGrns(replacementGrns)
        setClubDetails({ club_id: createdGrnData.club_id, club_display_number: createdGrnData.club_display_number, purchase_orders: createdGrnData.purchase_orders })
        setStateOption(grnMetadataDetails.grn_states)
        setWarehouseList([...warehouseList])
       
        let newTabs = [...initialTabs];
        if (createdGrnData?.is_include_fabric_material) {
          switch (createdGrnData?.state) {
            case COMPLETE_STATE:
              newTabs = [...initialTabs, ...completeTabs];
              break;
            case QUANTITY_VERIFICATION_STATE:
              newTabs = [...initialTabs, ...quantityVerificationTabs];
              break;
            case QA_VERIFICATION_STATE:
              newTabs = [...initialTabs, ...qaVerificationTabs];
              break;
            case GRN_VERIFICATION:
              newTabs = [
                ...initialTabs,
                ...qaVerificationTabs,
                {
                  value: grnTabs[grnVerificationTabKey][tabDisplayOrderKey],
                  label: grnTabs[grnVerificationTabKey][tabLabel],
                },
              ];
              break;
            default:
              break;
          }
        } else {
          newTabs = [...initialTabs, ...removedFabricTabs];
        }
        if (!createdGrnData?.is_shade_mapping_for_club) {
          newTabs = newTabs.filter(tab => tab.value !== grnTabs[shadeMappingTabKey][tabDisplayOrderKey]);
        }
        setGrnSummaryTabs([...new Set(newTabs)]);

      }).catch(() => {

      }).finally(() => {
        setIsLoading(false);
        setLoader(false);
      });
    }
  }

  const assignMaterialToGrn = () => {
    setIsMaterialAssigning(true)
    const assinedMaterials = {
      materials: selectedMaterials
    }
    api.post(GrnUrls.assignedMaterialsToGrnURl(grnId), assinedMaterials).then(resp => {
      const response = resp.data || []
      if (response) {
        fetchData()
        toast.success(DEFAULT_SUCCESS);
        setIsAddMaterialModalOpen(false)
      }

    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsMaterialAssigning(false))
  }

  const handleQrCodeGenerate = (materialId: number, materialType: any) => {
    api.get(GrnUrls.grCodeGenerateURL(materialId), { responseType: 'blob' }).then(response => {
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.setAttribute('download', `qr_code_${grnId}_${materialType}.pdf`);
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      window.URL.revokeObjectURL(url);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    });
  }

  const handleTemplateDownload = (materialId: number, materialType: any) => {
    api.get(GrnUrls.materialTemplateDownloadUrl(materialId), { responseType: 'blob' }).then(response => {
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.setAttribute('download', `${grnId}_${materialType}_template.xlsx`);
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      window.URL.revokeObjectURL(url);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    });
  }

  const handleMaterialFileUpload = (event: any, attachmentType: string, materialIndex: any, grnMaterialId: number) => {
    setIsUploading({ state: true, attachmentType: attachmentType });
    const uploadedFiles = event.target.files;
    const fileLocation = 'grn/material_pack_list';
    const files = Array.from(uploadedFiles || []);
    const uploadData = new FormData();
    uploadData.append('location', fileLocation);
    files.forEach((file: any) => {
      uploadData.append('files', file);
    });

    api.post(GrnUrls.materialFileAttachmentUploadUrl(grnMaterialId), uploadData)
      .then(resp => {
        const responseData = resp?.data || [];
        toast.success(DEFAULT_SUCCESS);
        fetchData();
        // if (responseData) {
        //   responseData.forEach((singleResponse: any) => {
        //     setCreatedGrnDetails((prevState: any) => ({
        //       ...prevState,
        //       supplierpogrnmaterial_set: prevState.supplierpogrnmaterial_set.map((material: any, index: number) => {
        //         if (index === materialIndex) {
        //           return {
        //             ...material,
        //             [materialPackListAttachmentIdKey]: singleResponse.id,
        //             [materialPackListAttachmentDetailsKey]: singleResponse
        //           };
        //         }
        //         return material;
        //       })
        //     }));
        //   })
        // }
      })
      .catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally(() => {
        setIsUploading({ state: false, attachmentType: attachmentType });
      });
  }

  const handleSaveGrn = () => {
    setIsSaving(true)

    const generalGrnDetails = {
      id: grnId > 0 ? Number(grnId) : null,
      supplier_po: grnId === 0 ? selectedData[supplierPoNumberKey] : createdGrnDetails?.[supplierPoIdKey],
      material_list: selectedMaterials.length > 0 ? selectedMaterials : [],
      invoice_number: grnId === 0 ? selectedInvoiceData['id'] : null,
      delivery_note: selectedDeliveryNote,
      replacement_grns: createdGrnDetails?.[replacementGrnsKey] || [],
      remark: createdGrnDetails && createdGrnDetails[remarksKey] !== '' ? createdGrnDetails[remarksKey] : null,
      supplier_pack_list: grnId === 0 ? selectedData[packListAttachmentDetailKey] : 0,
      attachments: grnId === 0 ? (createdGrnDetails ? createdGrnDetails[attachmentsKey] : []) : (createdGrnDetails ? createdGrnDetails[attachmentsKey] : []),
      state: createdGrnDetails && createdGrnDetails[stateKey] !== '' ? createdGrnDetails[stateKey] : 'draft',
      warehouse: createdGrnDetails?.warehouse || null,
    };

    const updateGrnDetails = {
      ...generalGrnDetails,
      data: (createdGrnDetails?.supplierpogrnmaterial_set || []).map((material: any) => ({
        supplier_po_grn_material_id: material.id,
        total_expected_quantity: material?.total_expected_quantity || null,
        total_expected_quantity_units: material?.total_expected_quantity_units || null,
        material_pack_list_attachment: material?.material_pack_list_attachment || null,
        grn_price: parseFloat(material?.grn_price) || null,
        delete_material_pack_list_attachment_id: material?.delete_material_pack_list_attachment_id || null,
        // grn_data: material.supplierpogrnmaterialdetail_set.map((item: any) => ({ ...item }))
        // grn_data: material.supplierpogrnmaterialdetail_set.map((item: any) => {
        //   const updatedItem = {};
        //   for (const key in item) {
        //   updatedItem[key] = item[key] === "" ? null : item[key];
        //  }
        // return updatedItem;
        // })
      }))
    };

    if (selectedData[supplierPoNumberKey] || createdGrnDetails?.supplier_po_id) {
      const request = {
        method: 'post',
        url: grnId === 0 ? GrnUrls.createNewGrnUrl() : GrnUrls.updateGrnDetailsUrl(grnId),
        data: grnId === 0 ? generalGrnDetails : updateGrnDetails
      }
      if (selectedMaterials.length > 0 || grnId > 0) {
        api(request).then((response) => {
          const resposeData = response?.data || [];
          if (grnId === 0) {
            router.push(createdGrnDetailsPageURL(resposeData.id))
          }
          toast.success(DEFAULT_SUCCESS);
          setIsEnableSubRowEdit(false)
          fetchData()
        }).catch(error => {
          toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsSaving(false));
      } else {
        toast.error("Please add materials before starting the GRN");
        setIsSaving(false)
      }

    } else {
      toast.error("Please Select the supplier PO before starting the GRN")
      setIsSaving(false)
    }
  }

  useEffect(() => {
    const { tab } = router.query;
      fetchData()

  }, [grnId])

  useEffect(() => {
    if (selectedData[supplierPoNumberKey] > 0 || supplierPo) {
      const requests = [
        api.get(GrnUrls.supplierPoMaterialDetailsUrl(selectedData[supplierPoNumberKey] || supplierPo)),
      ];
      Promise.all(requests).then(resp => {
        const response = resp.map((r: any) => r.data);
        const [materialDetails] = response;
        setMaterialMetaData({ ...materialDetails })
        setClubDetails({ club_id: materialDetails.po_club_id, club_display_number: materialDetails.club_display_number, purchase_orders: materialDetails.purchase_orders })
        setPackListData([...materialDetails.pack_list])
        if (supplierPo > 0) {
          setSelectedData(prev => ({
            ...prev,
            [supplierPoNumberKey]: supplierPo
          }))
        }

      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      });
    }
  }, [selectedData[supplierPoNumberKey], supplierPo])

  const [activeTab, setActiveTab] = useState('1');

  const handleChangeTabs = (event: string) => {
    const url = {
      pathname: router.pathname,
      query: { ...router.query, tab: event }
    }
    router.replace(url, undefined, { shallow: true });
  };

  useEffect(() => {
    const { tab } = router.query;
    if (tab) {
      setActiveTab(tab.toString());
      if (tab.toString() === '1') {
        fetchData();
      }
    }
  }, [router]);

  const [openShadeGroupModal, setOpenShadeGroupModal] = useState(false);
  const handleOpenShadeGroupModal = (materialId: number, supplierMaterialCodeId: any) => {
    setSelectedMaterialId(materialId);
    setSelectedSupplierMaterialCodeId(supplierMaterialCodeId)
    setOpenShadeGroupModal(true);
  }
  const handleCloseShadeGroupModal = () => {
    setOpenShadeGroupModal(false);
  };

  const getDeliveryDates = grnId > 0 ? createdGrnDetails?.[deliveryDatesKey] : materialMetaData?.[deliveryDatesKey]
  const deliveryDates: string[] = Array.from(new Set((getDeliveryDates || []).map((date: { confirmed_delivery_date: string }) => date.confirmed_delivery_date)));
  const sortedDeliveryDates: string[] = deliveryDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const allExpectedDeliveryDates: string = sortedDeliveryDates.join(', ');

  const [selectedPackListData, setSelectedPackListData] = useState<any>({});
  const [selectedInvoiceData, setSelectedInvoiceData] = useState<any>({});
  const [selectedDeliveryNote, setSelectedDeliveryNote] = useState<any>({ delivery_note: null });
  const [expectedDeliveryDatesList, setExpectedDeliveryDatesList] = useState([]);


  const handleSetSelectedPackListData = (event: any) => {
    const { name, value } = event.target
    const selectedObject = packListData.find((item: { id: number; }) => item.id === parseInt(value));
    setSelectedPackListData(selectedObject);
  }

  const handleSetSelectedInvoiceData = (event: any) => {
    const { name, value } = event.target
    const selectedObject = packListData.find((item: { id: number; }) => item.id === parseInt(value)).invoice;
    setSelectedInvoiceData(selectedObject);
  }

  const handleSetFilterMaterils = (event: any) => {
    const { name, value } = event.target;
    const selectedMaterials = packListData.find((item: { id: number; }) => item.id === parseInt(value))?.materials?.materials || [];
    setFilteredMaterials(selectedMaterials)
  }

  const handleSetSelectedDeliveryNote = (event: any) => {
    const { name, value } = event.target
    const selectedObject = packListData.find((item: { id: number; }) => item.id === parseInt(value)).delivery_note;
    setSelectedDeliveryNote(selectedObject);
  }

  const handleSetExpectedDateList = (event: any) => {
    const { name, value } = event.target
    const selectedObject = packListData.find((item: { id: number; }) => item.id === parseInt(value)).delivery_dates;
    setExpectedDeliveryDatesList([...selectedObject]);
  }

  const handleFileChange = (event: any) => {
    const updatedMarkerAttachments = [...event];
    setCreatedGrnDetails({
      ...createdGrnDetails,
      [attachmentsKey]: updatedMarkerAttachments,
    });
  };

  const handleChangeReplacementGrn = (event: any, data: any, reason: any) => {
    data.forEach((d: any) => d.value = d.id);
    const replacementsIds = data.map((replacement: any) => replacement.value);
    setCreatedGrnDetails({
      ...createdGrnDetails,
      [replacementGrnsKey]: replacementsIds,
    });
  }

  const handleActiveReportTab = (event: any, newValue: any) => {
    setActiveSequenceTypeTab(newValue);
  };
  const handleChangeState = (state: any) => {
    setIsChangeState(true)
    const request = {
      method: 'post',
      url: grnStateChangeURL(grnId),
      data: {
        new_state: state || null,
      }
    }
    api(request).then(() => {
      toast.success(DEFAULT_SUCCESS);
      setOpenStateChangeModal(false)
      fetchData()
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
      if(error?.response?.data?.status) {
        setShowErrorsModal(true)
        setGrnErrors({ ...error?.response?.data });
      }
    }).finally(() => {
      setIsChangeState(false)
    });
  }

  const handleOpenStateChangeModal = () => {
    setOpenStateChangeModal(true)
  }

  const handleClose = () => {
    setShowErrorsModal(false);
  };

  return (
    <>
      {loader && Object.keys(editStatusData).length !== 0 && <CircularLoader />}
      {showErrorsModal && (
        <RitzModal open={showErrorsModal} onClose={handleClose} maxWidth='md' fullWidth={true} title={"Errors"}>
          <Box sx={{ mt:1}}>
            <Box>
              {Object.entries(grnErrors).map(([errorKey, { display_value, errors }]: [string, any]) => {
                const normalizedErrors = Array.isArray(errors) ? errors : (errors ? [errors] : []);
                return normalizedErrors.length > 0 && (
                  <Box key={errorKey} sx={{ marginBottom: '15px' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', marginBottom: '8px' }}>{display_value}</Typography>
                    {normalizedErrors.map((error: any, index: number) => (
                      <Box key={`${keyHelper.getNextKeyValue()}`} sx={{ display: 'flex', mt: 1, justifyContent: 'left' }}>
                        <ErrorOutlineIcon color={'error'} fontSize='small' sx={{ mr: 1 }} />{error?.error}
                      </Box>
                    ))}
                  </Box>
                )
              })}
            </Box>
            <Box sx={{mt:1}}>
              <Alert severity="error">Some sections contain errors. Please review and correct them before continuing</Alert>
            </Box>
          </Box>
        </RitzModal>
      )}
      {isDeleteModalOpen?.[deleteModalStateKey] && <RitzModal
        open={isDeleteModalOpen?.[deleteModalStateKey]}
        onClose={handleDeleteModelClose}
        maxWidth='xs'
        title='Confirm Delete'>
        <>
          <Box>
            <Typography>Are you sure you want to delete this {isDeleteModalOpen?.[deletingTypeKey] === 'row' ? 'row' : 'attachment'}?</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'end', mt: 3 }}>
              <Button variant='contained' onClick={handleDeleteAction} color='error' disabled={isDeleting}>
                {isDeleting && <SaveSpinner />}Delete
              </Button>
            </Box>
          </Box>
        </>
      </RitzModal>}
      {isAddMaterialModalOpen && <RitzModal
        open={isAddMaterialModalOpen}
        onClose={handleAddMaterialModaClose}
        maxWidth='md'
        title='Assign New Materials'>
        <>
          {renderMaterialDetails()}
          <Box sx={{ mt: 2, float: 'right', mb: 2, mr: 1 }}>
            <Button variant='outlined' onClick={assignMaterialToGrn}>{isMaterialAssigning && <SaveSpinner />}Assign</Button>
          </Box>
        </>
      </RitzModal>}

      {openShadeGroupModal && (
        <RitzModal open={openShadeGroupModal} onClose={handleCloseShadeGroupModal} title='Shade Groups Details' maxWidth={'xl'} >
          <ShadeGroups grnId={grnId} materialId={selectedMaterialId} supplierMaterialCodeId={selectedSupplierMaterialCodeId} clubId={createdGrnDetails[clubIdKey]} />
        </RitzModal>
      )}
      {openStateChangeModal && (
        <RitzModal
          open={openStateChangeModal}
          onClose={() => setOpenStateChangeModal(false)}
          title="Edit Information"
          maxWidth="md"
        >
          <Box sx={{ mb: 3 }}>
            <InputLabel sx={{ mb: 1 }} >State</InputLabel>
            <RitzSelection
              id={'new_state'}
              name={'new_state'}
              optionValue={'id'}
              optionText={'name'}
              selectedValue={createdGrnDetails?.new_state || createdGrnDetails?.state}
              isRequired={true}
              options={stateOption}
              handleOnChange={(event: any) => {
                setCreatedGrnDetails({ ...createdGrnDetails, new_state: event.target.value });
              }}
            />
          </Box>
          <Box style={{ display: 'flex', justifyContent: 'end' }}>
            <Button variant="contained" color="primary" onClick={() => { handleChangeState(createdGrnDetails?.new_state) }} disabled={isSaving}>
              {isSaving && <SaveSpinner />}Update
            </Button>
          </Box>
        </RitzModal>
      )}
      {isLoading ? <DefaultLoader /> : <>
        <Box>
          <Box>
            <Grid container>
              <Grid item xs={12} md={6}>
                <RitzBreadcrumbs
                  items={[
                    { label: 'GRN Dashboard', url: '/goods_received_note' },
                    { label: 'GRN Summary' },
                  ]}
                  title={"GRN Details"}
                />
              </Grid>
            </Grid>
          </Box>
          <Box>
            {(createdGrnDetails?.[stateKey] !== GRN_DRAFT_STATE && canEdit) && (
              <Button sx={{ mb: 2, mr: 1 }} variant='outlined' onClick={() => { handleOpenStateChangeModal() }}>Edit Information</Button>
            )}
            {createdGrnDetails?.[stateKey] === GRN_DRAFT_STATE && (
              <Button sx={{ mb: 2, mr: 1 }} variant='outlined' disabled={isChangeState} onClick={() => { handleChangeState(QUANTITY_VERIFICATION_STATE) }}>
                {isChangeState && <SaveSpinner />}GRN Start
              </Button>
            )}
            {createdGrnDetails?.[stateKey] === QUANTITY_VERIFICATION_STATE && (
              <Button sx={{ mb: 2, mr: 1 }} variant='outlined' disabled={isChangeState} onClick={() => { handleChangeState(QA_VERIFICATION_STATE) }}>
                {isChangeState && <SaveSpinner />}<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><SendIcon />Send To Inspection Team</Box>
              </Button>
            )}
            {createdGrnDetails?.[stateKey] === QA_VERIFICATION_STATE && (
              <Button sx={{ mb: 2, mr: 1 }} variant='outlined' disabled={isChangeState} onClick={() => { handleChangeState(GRN_VERIFICATION) }}>
                {isChangeState && <SaveSpinner />}<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><VerifiedIcon /> QA Verified</Box>
              </Button>
            )}
            {createdGrnDetails?.[stateKey] === GRN_VERIFICATION && (
              <Button sx={{ mb: 2, mr: 1 }} variant='outlined' disabled={isChangeState} onClick={() => { handleChangeState(COMPLETE_STATE) }}>
                {isChangeState && <SaveSpinner />}<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CheckIcon color='success' />GRN Verified & Complete</Box>
              </Button>
            )}
            {createdGrnDetails?.[stateKey] === COMPLETE_STATE && (
              <Button sx={{ mb: 2, mr: 1 }} variant='outlined' disabled={isChangeState} onClick={() => { handleChangeState(CANCEL_STATE) }}>
                {isChangeState && <SaveSpinner />}<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CloseIcon color='error' />Cancel GRN</Box>
              </Button>
            )}
            {(createdGrnDetails?.[stateKey] !== COMPLETE_STATE || (createdGrnDetails?.[stateKey] === COMPLETE_STATE && canEdit)) && (
              <Button sx={{ mb: 2 }} variant='outlined' onClick={handleSaveGrn}>{isSaving && <SaveSpinner />}Update Details</Button>
            )}
          </Box>

          <Card variant='outlined' sx={{ mb: 2, p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4} lg={3} >
                <Box sx={{ m: 1 }}>
                  {createdGrnDetails?.[supplierPoIdKey] != undefined ? (
                    <>
                      <RitzInput
                        fullWidth
                        size={'small'}
                        selectedValue={createdGrnDetails?.[supplierPoNumberKey]}
                        labelText={"Supplier PO:"}
                        isReadOnly={true} />
                    </>
                  ) : (
                    <>
                      <RitzInput
                        fullWidth
                        size={'small'}
                        selectedValue={materialMetaData?.[supplierPoNumberKey]}
                        labelText={"Supplier PO:"}
                        isReadOnly={true} />
                    </>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={3}>
                <Box sx={{ m: 1 }}>
                  <Typography variant='h6' sx={{ mb: 2 }}>Pack List:</Typography>
                  {grnId > 0 ? (
                    <>
                      <RitzInput
                        fullWidth
                        name={'pack_list_attachment_detail'}//todo
                        size={'small'}
                        selectedValue={createdGrnDetails?.['supplier_pack_list_display'] || ''}//todo
                        isReadOnly={true}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Tooltip title="Download" arrow>
                          <FileDownloadIcon
                            color="primary"
                            sx={{ marginLeft: '0.1rem', verticalAlign: 'middle', fontSize: '20px', cursor: 'pointer' }}
                            onClick={() => handleDownload(createdGrnDetails?.['supplier_pack_list']?.['file_path'], createdGrnDetails?.['supplier_pack_list']?.['display_name'])}
                          />
                        </Tooltip>
                        <Typography sx={{ marginLeft: '0.5rem', wordBreak: 'break-all' }}>
                          {createdGrnDetails?.['supplier_pack_list']?.['display_name']}
                        </Typography>
                      </Box>
                    </>
                  ) : (
                    <>
                      <RitzSelection
                        id={idKey}
                        name={'pack_list_attachment_detail'}
                        optionValue={'id'}
                        optionText={'display_number'}
                        selectedValue={selectedData?.[packListAttachmentDetailKey] || ''}
                        size={'small'}
                        isReadOnly={false}//Todo
                        options={packListData}
                        handleOnChange={(event: any) => {
                          handleSelectedGeneralData(event);
                          handleSetSelectedPackListData(event);
                          handleSetSelectedInvoiceData(event);
                          handleSetSelectedDeliveryNote(event);
                          handleSetFilterMaterils(event);
                          handleSetExpectedDateList(event);
                        }}
                      />
                      {selectedData?.[packListAttachmentDetailKey] !== 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          <Tooltip title="Download" arrow>
                            <FileDownloadIcon
                              color="primary"
                              sx={{ marginLeft: '0.1rem', verticalAlign: 'middle', fontSize: '20px', cursor: 'pointer' }}
                              onClick={() => handleDownload(selectedPackListData?.['pack_list']?.['file_path'], selectedPackListData?.['pack_list']?.['display_name'])}
                            />
                          </Tooltip>
                          <Typography sx={{ marginLeft: '0.5rem', wordBreak: 'break-all' }}>
                            {selectedPackListData?.['pack_list']?.['display_name']}
                          </Typography>
                        </Box>
                      )}
                    </>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={3}>
                <Box sx={{ m: 1 }}>
                  {grnId > 0 ? (
                    <>
                      <RitzInput
                        fullWidth
                        name={invoiceNumberKey}
                        size={'small'}
                        selectedValue={createdGrnDetails?.['delivery_note_display_number'] || ''}
                        labelText={"DeliveryNote:"}
                        isReadOnly={true}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Tooltip title="Download" arrow>
                          <FileDownloadIcon
                            color="primary"
                            sx={{ marginLeft: '0.1rem', verticalAlign: 'middle', fontSize: '20px', cursor: 'pointer' }}
                            onClick={() => handleDownload(createdGrnDetails?.['delivery_note']?.['file_path'], createdGrnDetails?.['delivery_note']?.['display_name'])}
                          />
                        </Tooltip>
                        <Typography sx={{ marginLeft: '0.5rem', wordBreak: 'break-all' }}>
                          {createdGrnDetails?.['supplier_invoice_number']?.['display_name']}
                        </Typography>
                      </Box>
                    </>

                  ) : (
                    <>
                      <RitzInput
                        fullWidth
                        name={invoiceNumberKey}
                        size={'small'}
                        selectedValue={selectedPackListData?.debit_note_display_number || ''}
                        labelText={"DeliveryNote:"}
                        isReadOnly={true}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Tooltip title="Download" arrow>
                          <FileDownloadIcon
                            color="primary"
                            sx={{ marginLeft: '0.1rem', verticalAlign: 'middle', fontSize: '20px', cursor: 'pointer' }}
                            onClick={() => handleDownload(selectedDeliveryNote?.['delivery_note']?.['file_path'], selectedDeliveryNote?.['delivery_note']?.['display_name'])}
                          />
                        </Tooltip>
                        <Typography sx={{ marginLeft: '0.5rem', wordBreak: 'break-all' }}>
                          {selectedDeliveryNote?.['delivery_note']?.['display_name']}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={3}>
                <Box sx={{ m: 1 }}>
                  {grnId > 0 ? (
                    <>
                      <RitzInput
                        fullWidth
                        name={invoiceNumberKey}
                        size={'small'}
                        selectedValue={createdGrnDetails?.['supplier_invoice_number_dispaly'] || ''}
                        labelText={"Invoice Number:"}
                        isReadOnly={true}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Tooltip title="Download" arrow>
                          <FileDownloadIcon
                            color="primary"
                            sx={{ marginLeft: '0.1rem', verticalAlign: 'middle', fontSize: '20px', cursor: 'pointer' }}
                            onClick={() => handleDownload(createdGrnDetails?.['supplier_invoice_number']?.['file_path'], createdGrnDetails?.['supplier_invoice_number']?.['display_name'])}
                          />
                        </Tooltip>
                        <Typography sx={{ marginLeft: '0.5rem', wordBreak: 'break-all' }}>
                          {createdGrnDetails?.['supplier_invoice_number']?.['display_name']}
                        </Typography>
                      </Box>
                    </>

                  ) : (
                    <>
                      <RitzInput
                        fullWidth
                        name={invoiceNumberKey}
                        size={'small'}
                        selectedValue={selectedInvoiceData['invoice_number'] || ''}
                        labelText={"Invoice Number:"}
                        isReadOnly={true}
                      />
                      {selectedInvoiceData?.['id'] && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          <Tooltip title="Download" arrow>
                            <FileDownloadIcon
                              color="primary"
                              sx={{ marginLeft: '0.1rem', verticalAlign: 'middle', fontSize: '20px', cursor: 'pointer' }}
                              onClick={() => handleDownload(selectedInvoiceData?.['invoice']?.['file_path'], selectedInvoiceData?.['invoice']?.['display_name'])}
                            />
                          </Tooltip>
                          <Typography sx={{ marginLeft: '0.5rem', wordBreak: 'break-all' }}>
                            {selectedInvoiceData?.['invoice']?.['display_name']}
                          </Typography>
                        </Box>
                      )}
                    </>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={3}>
                <Box sx={{ m: 1 }}>
                  <RitzInput
                    fullWidth
                    size={'small'}
                    selectedValue={materialMetaData[supplierNameKey] || createdGrnDetails?.[supplierNameKey]}
                    labelText={"Supplier:"}
                    isReadOnly={true} />
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={3}>
                <Box sx={{ m: 1 }}>
                  <RitzInput
                    fullWidth
                    size={'small'}
                    labelText={"GRN ID:"}
                    selectedValue={createdGrnDetails?.['grn_number'] || ''}
                    isReadOnly={true}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={3}>
                <Box sx={{ m: 1 }}>
                  <RitzInput
                    fullWidth
                    name={`supplier`}
                    size={'small'}
                    selectedValue={createdGrnDetails?.[createdKey] ? createdGrnDetails?.[createdKey].split('T')[0] : currentDate}
                    labelText={"GRN Date:"}
                    isReadOnly={true}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={3}>
                <Box sx={{ m: 1 }}>
                  <RitzInput
                    fullWidth
                    name={remarksKey}
                    id={remarksKey}
                    selectedValue={createdGrnDetails?.[remarksKey] || null}
                    size={'small'}
                    labelText={"Remarks:"}
                    handleOnChange={(event: any) => handleMetaDataValueChange(event)}
                    inputType='text'
                  />
                </Box>
              </Grid>
              {grnId > 0 && <Grid item xs={12} sm={6} md={4} lg={3}>
                <Box sx={{ m: 1 }}>
                <RitzInput
                    fullWidth
                    name={stateKey}
                    id={stateKey}
                    selectedValue={createdGrnDetails?.['state_display'] || null}
                    size={'small'}
                    labelText={"State:"}
                    inputType='text'
                    isReadOnly={true}
                  />
                </Box>
              </Grid>}
              <Grid item xs={12} sm={6} md={4} lg={3}>
                <Box sx={{ m: 1 }}>
                  <Typography variant='h6'>Replacement GRNs: </Typography>
                  <Box sx={{ mt: 2 }}>
                    <RitzMultiSelectCheckBox
                      id={'replacement'}
                      selectOptions={supplierPo ? materialMetaData.replacement_grns : replacementGrns}
                      optionValue={'id'}
                      optionDisplayValue={'display_name'}
                      handleOnChange={handleChangeReplacementGrn}
                      selectedValues={createdGrnDetails?.[replacementGrnsKey] || []}
                      handleOnClose={() => console.log('todo remove this')}
                      size={'small'}
                    />
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={3}>
                <Box sx={{ m: 1 }}>
                  <RitzSelection
                    fullWidth
                    id={'warehouse'}
                    name={'warehouse'}
                    optionValue={idKey}
                    optionText={'name'}
                    size={'small'}
                    labelText={"Warehouse:"}
                    selectedValue={createdGrnDetails?.['warehouse'] || ''}
                    options={warehouseList}
                    handleOnChange={(event: any) => handleMetaDataValueChange(event)}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={3}>
                <Box sx={{ m: 1 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                    <Typography variant='h6' >Supplier PO Attachment:</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                    {createdGrnDetails?.['supplier_po_file_path'] ? (
                      <>
                        <Tooltip title="Download" arrow>
                          <FileDownloadIcon
                            color="primary"
                            sx={{
                              marginLeft: '0.1rem',
                              verticalAlign: 'middle',
                              fontSize: '20px',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleDownload(createdGrnDetails?.['supplier_po_file_path'], createdGrnDetails?.['supplier_po_display_name'])}
                          />
                        </Tooltip>
                        <Typography sx={{ marginLeft: '0.5rem', wordBreak: 'break-all' }}>
                          {createdGrnDetails['supplier_po_display_name']}
                        </Typography>
                      </>
                    ) : (<><Typography sx={{ color: red[500] }}></Typography></>)}
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={3}>
                <Box sx={{ m: 1 }}>
                  <Typography variant='h6'>Other Attachments: </Typography>
                  <RitzMultipleFileUploader
                    displayType={LISTVIEW}
                    selectedFilesParent={createdGrnDetails?.[attachmentsKey] || []}
                    handleFileChangeParent={(selectedFiles: any) => handleFileChange(selectedFiles)}
                    filelocation={fileAttacehemtLocation} />
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={3} >
                <Box sx={{ m: 1 }}>
                  {grnId === 0 ? (
                    <>
                      <Typography variant='h6'>Expected Delivery Date's : </Typography>
                      {expectedDeliveryDatesList.map((deliveryDate: any, deliveryDateIndex: any) => (
                        <Box key={deliveryDateIndex} display="flex" alignItems="center" sx={{ mb: 1, mt: 1 }}>
                          <FiberManualRecordIcon color={'primary'} sx={{ marginRight: '5px', fontSize: '10px' }} />
                          {deliveryDate.delivery_date}
                        </Box>
                      ))}
                    </>
                  ) : (
                    <>
                      <Typography variant='h6'>Expected Delivery Date's : </Typography>
                      {createdGrnDetails['supplierdeliverydate_set'].map((deliveryDate: any, deliveryDateIndex: any) => (
                        <Box key={deliveryDateIndex} display="flex" alignItems="center" sx={{ mb: 1, mt: 1 }}>
                          <FiberManualRecordIcon color={'primary'} sx={{ marginRight: '5px', fontSize: '10px' }} />
                          {deliveryDate.confirmed_delivery_date}
                        </Box>
                      ))}
                    </>
                  )}
                </Box>
              </Grid>
              {clubDetails.club_id ? (
                <Grid item xs={12} sm={6} md={4} lg={3} >
                  <Box sx={{ m: 1 }}>
                    <>
                      <Typography variant='h6' sx={{ mb: 2 }}>PO Club:</Typography>
                      <Link target='_blank' component={NextLink} href={purchaseOrderClubDetailsPageURL(clubDetails?.club_id)}>{clubDetails?.club_display_number}</Link>
                    </>
                  </Box>
                </Grid>
              ) : (
                <Grid item xs={12} sm={6} md={4} lg={3} >
                  <Box sx={{ m: 1 }}>
                    <>
                      <Typography variant='h6' sx={{ mb: 1 }}>General PO:</Typography>
                      <Link target='_blank' component={NextLink} href={generalPurchaseOrderDetailsPageURL(createdGrnDetails?.[generalPoIdKey])}>{createdGrnDetails?.[generalPoDisplayNumberKey]}</Link>
                    </>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Card>
        </Box>
        <Box>
          <TabContext value={activeTab}>
            <RitzTabsWithParams
              tabs={grnSummaryTabs}
              activeTab={activeTab}
              emitChange={handleChangeTabs}
            />
            <RitzTabPanelWithParams value={`${grnTabs[grnDetailsTabKey][tabDisplayOrderKey]}`}>
              {selectedPackListData['id'] > 0 || grnId > 0 ? (
                <>
                  {(grnId > 0 && createdGrnDetails?.[stateKey] == 'draft') && <Box sx={{ mt: 2, float: 'right', mb: 2, mr: 2 }}>
                    <Button variant='outlined' onClick={handleAddMaterialModaOpen}>Assign Materials</Button>
                  </Box>}
                  <Box sx={{ m: 2 }}>
                    {grnId === 0 && (
                      <>
                        {renderMaterialDetails()}
                      </>
                    )}
                    {grnId > 0 && (
                      <Box>
                        <RitzTable
                          columns={updatedMaterialColumns}
                          data={createdGrnDetails?.supplierpogrnmaterial_set}
                          getRowCanExpand={getRowCanExpand}
                          renderSubComponent={(row: any) => renderSubRow({ row: row })} />
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {grnId > 0 ? (
                      (createdGrnDetails?.[stateKey] !== COMPLETE_STATE || (createdGrnDetails?.[stateKey] === COMPLETE_STATE && canEdit)) && (
                        <Button variant="contained" onClick={handleSaveGrn}>
                          {isSaving && <SaveSpinner />} Update
                        </Button>
                      )
                    ) : (
                      <Button variant="contained" onClick={handleSaveGrn}>
                        {isSaving && <SaveSpinner />} Start GRN
                      </Button>
                    )}
                  </Box>
                </>
              ) : (
                <>
                  <Alert severity="info">Please first select Pack List.</Alert>
                </>
              )}
            </RitzTabPanelWithParams>
            <RitzTabPanelWithParams value={`${grnTabs[shadeMappingTabKey][tabDisplayOrderKey]}`}>
              <Grid container>
                <Grid item xs={12}>
                  <Box>
                    <POClubShadeMapping grnId={grnId} />
                  </Box>
                </Grid>
              </Grid>
            </RitzTabPanelWithParams>
            <RitzTabPanelWithParams value={`${grnTabs[fabricInspectionTabKey][tabDisplayOrderKey]}`}>
              <Grid container>
                <Grid item xs={12}>
                  <Box>
                    <FabricInspection grnDetails={createdGrnDetails} sourceId={grnId} sourceDataUrl={GrnUrls.fabricInspectionMaterialDetailsUrl} currentState={createdGrnDetails?.state} />
                  </Box>
                </Grid>
              </Grid>
            </RitzTabPanelWithParams>
            <RitzTabPanelWithParams value={`${grnTabs[shrinkageTabKey][tabDisplayOrderKey]}`}>
              <Grid container>
                <Grid item xs={12}>
                  <Box>
                    <FabricShrinkage sourceId={grnId} poClubId={createdGrnDetails?.club_id} />
                  </Box>
                </Grid>
              </Grid>
            </RitzTabPanelWithParams>
            <RitzTabPanelWithParams value={`${grnTabs[reportsTabKey][tabDisplayOrderKey]}`}>
              <Box sx={{ flexGrow: 1, bgcolor: 'background.paper', display: 'flex', width: '100%' }}>
                <Tabs
                  orientation="vertical"
                  variant="scrollable"
                  value={activeReportTab}
                  onChange={handleActiveReportTab}
                  aria-label="Vertical tabs example"
                  sx={{ borderRight: 1, borderColor: 'divider' }}
                >
                  {reportsTabs.map((tab: any, tabIndex: any) => (
                    <Tab key={tabIndex} label={tab.label} value={tab.value} />
                  ))}
                </Tabs>
                <Box sx={{ flex: 1, overflow: 'auto', ml: 2 }}>
                  {activeReportTab === 'bom' && (
                    <Box sx={{ mb: 3 }}>
                      <Box>
                        {clubDetails?.club_id ? (
                          <BomDetails poDetails={clubDetails?.[purchaseOrderIdsKey]} clubId={clubDetails?.club_id} />
                        ) : (
                          <GeneralPOBomDetails generalPOId={createdGrnDetails?.[generalPoIdKey]} />
                        )}
                      </Box>
                    </Box>
                  )}
                  {activeReportTab === 'inspection_report' && (
                    <Box sx={{ mb: 3 }}>
                      <Box>
                        <InspectionReport sourceId={grnId} sourceDataUrl={GrnUrls.grnShadeGroupSummaryUrl} />
                      </Box>
                    </Box>
                  )}
                  {activeReportTab === 'shade_summary' && (
                    <Box sx={{ mb: 3 }}>
                      <Box>
                        <ShadeGroupsSummary sourceId={grnId} sourceDataUrl={GrnUrls.grnShadeGroupSummaryUrl} clubId={createdGrnDetails?.[clubIdKey]} imageUpdloadUrl={GrnUrls.grnActualShadeGroupAttachmentUploadUrl} />
                      </Box>
                    </Box>
                  )}
                  {activeReportTab === 'qr_codes' && (
                    <Box sx={{ mb: 3 }}>
                      <Box>
                        <GRNQRcodes sourceId={grnId} />
                      </Box>
                    </Box>
                  )}
                  {activeReportTab === 'fabric_report' && (
                    <Box sx={{ mb: 3 }}>
                      <Box>
                        <GrnFabricSummary grnId={grnId} />
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            </RitzTabPanelWithParams>
            <RitzTabPanelWithParams value={`${grnTabs[ddqTabKey][tabDisplayOrderKey]}`}>
              <Grid container>
                <Grid item xs={12}>
                  <Box>
                    <DDQDetails supplierPoId={grnId === 0 ? selectedData[supplierPoNumberKey] : createdGrnDetails?.[supplierPoIdKey]} />
                  </Box>
                </Grid>
              </Grid>
            </RitzTabPanelWithParams>
            <RitzTabPanelWithParams value={`${grnTabs[ddqiTabKey][tabDisplayOrderKey]}`}>
              <Grid container>
                <Grid item xs={12}>
                  <Box>
                    <DDQIDetails supplierPoId={grnId === 0 ? selectedData[supplierPoNumberKey] : createdGrnDetails?.[supplierPoIdKey]} />
                  </Box>
                </Grid>
              </Grid>
            </RitzTabPanelWithParams>
            <RitzTabPanelWithParams value={`${grnTabs[grnVerificationTabKey][tabDisplayOrderKey]}`}>
              <Grid container>
                <Grid item xs={12}>
                  <Box>
                    <GrnAdjustment grnId={grnId} />
                  </Box>
                </Grid>
              </Grid>
            </RitzTabPanelWithParams>
          </TabContext>
        </Box>

      </>}
    </>
  )
}

export default GrnDetailView