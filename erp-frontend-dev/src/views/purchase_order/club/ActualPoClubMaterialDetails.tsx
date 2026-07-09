import DefaultLoader from '@/components/DefaultLoader'
import RitzTable from '@/components/Ritz/RitzTable'
import { getDefaultError } from '@/helpers/Utilities'
import api from '@/services/api'
import { Box, Button, Checkbox, Divider, Grid, IconButton,Tooltip,Typography } from '@mui/material'
import { ColumnDef } from '@tanstack/react-table'
import React, { useEffect, useState } from 'react'
import toast, { ErrorIcon } from 'react-hot-toast'
import * as poUrls from "@/helpers/constants/rest_urls/POUrls";
import RitzModal from '@/components/Ritz/RitzModal'
import SaveSpinner from '@/components/SaveSpinner'
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants'
import { PENDING_MATERIALS_REVIEW_PO_CLUB_STATE } from '@/helpers/constants/PurchaseOrderStates'
import InvertColorsIcon from '@mui/icons-material/InvertColors';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import ColorTones from './ColorTones'
import LaunchIcon from '@mui/icons-material/Launch';
import AssignLeftOver from './AssignLeftOver'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import LeftOverRowDetailsView from './LeftOverRowDetailsView'
import * as RestUrls from '../../../helpers/constants/RestUrls';

const ActualPoClubMaterialDetails = ({clubId, currentState}: any) => {

    const materialColumns: ColumnDef<any>[] = [
    {
        accessorKey: 'generic_material_id',
        header: '',
        enableSorting: false,
        enableColumnFilter: false,
        enableGlobalFilter: false,
        cell: props => (
          currentState === PENDING_MATERIALS_REVIEW_PO_CLUB_STATE ? (
            <Checkbox
             checked={selectedMergingMaterials.some(
               (material: any) => material.indexValue === props.row.index
             )}
             onChange={() => handleSelectedIds(props.row.index, props.row.original.attributes.customer_brand_material_id , props.row.original.attributes.material_label)} />
           ) : null
        ),
        meta: {
          align: 'center',
          width: currentState === PENDING_MATERIALS_REVIEW_PO_CLUB_STATE ? 50 : 0
      }
    },
    {
      accessorKey: 'generic_material_id',
      header: '',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
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
      meta: {
        align: 'center',
        width: currentState === PENDING_MATERIALS_REVIEW_PO_CLUB_STATE ? 50 : 0
    }
    },
    {
        accessorKey: 'material_label',
        header: 'Material Type',
        cell: (props) => props.row.original.attributes.material_label || '--',
    },
    {
      accessorKey: '',
      header: 'Material Description',
      cell: (props) => {
        return (
          <Box sx={{ height: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {props.row.original.headers.map((header: any, headerIndex: any) => (
              <Typography key={headerIndex}>
                {header.label} : {props.row.original.attributes?.[header.name]}
              </Typography>
            ))}
          </Box>
        );
      }
    },
    { 
      accessorKey: 'ritz_customer_brand_reference_code',
      header: 'Ritz Reference Code',
      cell: (props) => props.row.original.attributes.ritz_customer_brand_reference_code || '--',
    },
    { 
      accessorKey: 'reference_code',
      header: 'Reference code',
      cell: (props) => props.row.original.attributes.reference_code || '--',
    },
    {
      accessorKey: 'reference_code',
      header: 'Color Tones',
      cell: (props) => {
          const colorTones = props.row.original.color_tones?.acceptable_color_tones;
          const colorToneDisplays = colorTones?.map((tone: { color_tone_display: any }) => tone.color_tone_display).join(', ');
          return (
            <Box sx={{ wordBreak: 'break-all' }}>
              {colorToneDisplays || '--'}
            </Box>
          );
      },
    }, 
    {
      accessorKey: '',
      header: 'Actions',
      cell: (props) => {
        const costingVersionId = props.row.original.costing_version_id;
        const customerBrandMaterialId = props.row.original.attributes.customer_brand_material_id;
        const material_type = props.row.original.attributes.material_type; 
        return (
          <>
            <div style={{ display: 'inline-block', width: 48, textAlign: 'center' }}>
              {material_type === 'fabric' ? (
                <Tooltip title="Color Tones Details">
                  <IconButton
                    onClick={() => handleOpenColorTonesModal(customerBrandMaterialId)}
                  >
                    <FormatColorFillIcon fontSize="inherit" color="primary" />
                  </IconButton>
                </Tooltip>
              ) : (
                <div style={{ width: 48 }} />  
              )}
            </div>
            <div style={{ display: 'inline-block', width: 48, textAlign: 'center' }}>
              <Tooltip title="Allocate Left Over">
                <IconButton onClick={() => handleClick(costingVersionId,customerBrandMaterialId)}>
                  <LaunchIcon />
                </IconButton>
              </Tooltip>
            </div>
          </>
        );
      },
    }
    ]

  const [isLoading, setIsLoading] = useState(true)
  const [clubMaterials, setClubMaterials] = useState<any>([]);
  const [selectedMergingMaterials, setSelectedMergingMaterials ] = useState<any>([])
  const [isMaterialMergeModalOpen, setIsMaterialMergeModalOpen] = useState(false)
  const [isMerging, setIsMerging] = useState(false)
  const [errorsModalOpen, setErrorsModalOpen] = useState(false);
  const [errors, setErrors] = useState<any>('');
  const [openColorTonesModal, setOpenColorTonesModal] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState(null)
  const [isAssignLeftOverModalOPen, setIsAssignLeftOverModalOPen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<any>({});
  const [expandedRowId, setExpandedRowId] = useState(null)
  const mergeModalTitle = 'Confirmation'
  const [leftOverData, setLeftOverData] = useState<any>([]);

  const handleRowExpand = (row: any) => {
  
    const customer_brand_material_id = row.original.attributes.customer_brand_material_id;
    const Url = RestUrls.allocatedLeftOverDtailsURL(clubId,customer_brand_material_id);
        api.get(Url)
            .then(resp => {
                const resdata = resp?.data || [];
                setLeftOverData((prevData: any) => ({
                  ...prevData,
                  [row.original.id]: resdata
                }));
                row?.toggleExpanded();
          
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => setIsLoading(false));
  }

  const getRowCanExpand = (row: any) => {
    const subRows = row?.original?.subRows || [];
    return subRows.length > 0;
  };

  const renderSubRow = ({ row }: any) => (
    isLoading ? 
      <DefaultLoader /> : 
      <LeftOverRowDetailsView 
        expandedRowId={expandedRowId} 
        leftOverData={leftOverData[row?.original?.id]}
        handleRowExpand={handleRowExpand}
      />
  );
  
  const handleLeftOverModalClose = () => {
    setIsAssignLeftOverModalOPen(false)
  }
  
  const handleClick = (costingVersionId:any,customerBrandMaterialId:any) => {
    setIsAssignLeftOverModalOPen(true)
    setSelectedIds({costingVersionId,customerBrandMaterialId});
  }

  const fetchPorchaseOrderClubMaterialDetails = () => {
    setIsLoading(true)
    const requests = [
      api.get(poUrls.actualClubMaterialList(clubId)),
    ] 

    Promise.all(requests).then(response => {
      const [materialData] = response.map((r: any) => r.data);
      setClubMaterials(materialData)
      }).catch(error => {
          toast.error(getDefaultError(error?.response?.status));
      }).finally(() => setIsLoading(false));
  }

  const handleSelectedIds = (indexValue: any, materialId: any, materialLabel: any) => {
    const isMaterialSelected = selectedMergingMaterials.some(
      (material: any) => material.indexValue === indexValue
    );
    if (!isMaterialSelected) {
      setSelectedMergingMaterials((prevMaterials: any) => [
        ...prevMaterials,
        { indexValue, materialId, materialLabel },
      ]);
    } else {
      setSelectedMergingMaterials((prevMaterials: any) =>
        prevMaterials.filter((material: any) => material.indexValue !== indexValue)
      );
    }
  };

  const handleMaterialMergeModalOpen = () => {
    if(selectedMergingMaterials.length === 0){
      toast.error("There is no selected fabric materials to merge");
    }else if(selectedMergingMaterials.length === 1) {
      toast.error("You need to select more that one duplicate fabric materials to merge.");
    }else{
      setIsMaterialMergeModalOpen(true)
    }
  }

  const handleOpenColorTonesModal =(materialId:any)=>{
    setOpenColorTonesModal(true)
    setSelectedMaterial(materialId)
  }

  const handleSave = () => {
    setIsMerging(true);
    const mergeMaterialData = {
      merge_ids: selectedMergingMaterials.map((material: any) => material.materialId),
    }

    api.post(poUrls.poClubMaterialMergeURL(clubId), mergeMaterialData).then(response => {
      const responseData = response?.data || {};
      if(responseData){
        toast.success(DEFAULT_SUCCESS);
        setIsMaterialMergeModalOpen(false)
        setSelectedMergingMaterials([]);
        fetchPorchaseOrderClubMaterialDetails()
      }
    }).catch(error => {
      const errorMessages = error.response.data.error;
      setErrorsModalOpen(true)
      setErrors(errorMessages)
    }).finally(() => setIsMerging(false));
    
  }

  const handleErrorsDialogClose = () => {
    setErrors([]);
    setErrorsModalOpen(false);
    setIsMaterialMergeModalOpen(false)
  };

  useEffect(() => {
    if(clubId > 0){
        fetchPorchaseOrderClubMaterialDetails()
    }
  }, [clubId])

  return (
    <>
    { isAssignLeftOverModalOPen && (
      <RitzModal
        open={isAssignLeftOverModalOPen}
        onClose={handleLeftOverModalClose}
        maxWidth='lg'
        title='Allocate Left Over'
        >
        <AssignLeftOver
          costingVersionId={selectedIds?.costingVersionId}
          customerBrandMaterialId={selectedIds?.customerBrandMaterialId}
          clubId={clubId}
          handleClose={handleLeftOverModalClose}
          currentState={currentState}
          handleRowExpand={handleRowExpand}
        />
      </RitzModal>
    )}

    {isLoading ? <DefaultLoader /> : <>
        {currentState === PENDING_MATERIALS_REVIEW_PO_CLUB_STATE &&
        <Box>
          <Button variant='outlined' sx={{float: 'right'}} onClick={handleMaterialMergeModalOpen}>Merge</Button>
        </Box>}
        <Box>
        <RitzTable 
          columns={materialColumns}
          data={clubMaterials}
          getRowCanExpand={getRowCanExpand}
          renderSubComponent={renderSubRow}
          />
        </Box>
        </>}
        {isMaterialMergeModalOpen && (
      <RitzModal open={isMaterialMergeModalOpen} onClose={() => setIsMaterialMergeModalOpen(false)} title={mergeModalTitle}>
          <Typography> Are you sure you want to merge these materials? </Typography>
          <Typography sx={{fontWeight: 500}}>{selectedMergingMaterials.map((material: any) => material.materialLabel).join(' , ')}</Typography>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'end' }}>
              <Button variant="contained"   onClick={() => {handleSave()}} >{isMerging && <SaveSpinner/>}Confirm</Button>
          </Box>
      </RitzModal>
      )}
      {openColorTonesModal && (
        <RitzModal open={openColorTonesModal} onClose={() => setOpenColorTonesModal(false)} title={"Color Tones Details"}>
          <ColorTones materialId={selectedMaterial} clubId={clubId} savedStatus={() => setOpenColorTonesModal(false)}/>
        </RitzModal>
      )}
      {errorsModalOpen && (
            <RitzModal open={errorsModalOpen} onClose={handleErrorsDialogClose} title='Operation Failed'>
              Please fix the issues below to continue this stage.
              <Divider sx={{ mt: 2, mb: 3 }} />
              <Box>
                  <Grid container spacing={1} >
                    <Grid item>
                      <ErrorIcon style={{ verticalAlign: 'middle', color: 'red', fontSize: 'medium' }} />
                    </Grid>
                    <Grid item xs={11}>
                      <span>{errors}</span>
                    </Grid>
                  </Grid>
              </Box>
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'end' }}>
                <Button variant="outlined" color='secondary' onClick={handleErrorsDialogClose}>Close</Button>
              </Box>
            </RitzModal>
          )}
    </>
  )
}

export default ActualPoClubMaterialDetails