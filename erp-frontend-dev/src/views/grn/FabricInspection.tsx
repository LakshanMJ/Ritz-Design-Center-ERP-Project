import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Alert, Box, Card, CardHeader, Grid, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import api from '@/services/api';
import * as GrnUrls from '../../helpers/constants/rest_urls/GrnUrls';
import RitzUploader from '@/components/Ritz/RitzUploader';
import RitzImageUploader from '@/components/Ritz/RitzImageUploader';
import { THUMBNAILVIEW } from '@/helpers/constants/FileUpload';
import RitzTable from '@/components/Ritz/RitzTable';
import RitzInput from '@/components/Ritz/RitzInput';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import GrnRowDetailsView from './GrnRowDetailsView';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import DefectDetails from './DefectDetails';

const FabricInspection = ({ sourceId, sourceDataUrl, currentState }: any) => {
  const grnHeadersKey = 'grn_headers';
  const materialPackListAttachmentDetailsKey = 'material_pack_list_attachment_details';
  const readyForInspectionStateKey ='ready_for_inspection';
  const nextTypeKey = 'next';
  const loadNextKey = 'load_next';
  const lastInspectionRollKey = 'last_inspection_roll';
  const skippedBatchesKey = 'skipped_batches';


  const [isLoading, setIsLoading] = useState(true);
  const [isAllRowsCollapse, setIsAllRowsCollapse] = useState(true);
  const [grnDetails, setGrnDetails] = useState<any>({state:'',supplier_po_grn_material_set:[]});
  const [openDefectModal, setOpenDefectModal] = useState(false);
  const [materialDetailData, setMaterialDetailData] = useState<any>({});
  const subRowDetails = materialDetailData?.supplierpogrnmaterialdetail_set;
  const [readyForInspectionItem, setReadyForInspectionItem] = useState<any>({});
  const [skippedBatches, setSkippedBatches] = useState<any>([]);
  const [showSkippedBatchesModal, setShowSkippedBatchesModal] = useState(false);

  const fetchData = () => {
    if (sourceId > 0) {
      const requests = [
        api.get(sourceDataUrl(sourceId)),
      ]
      Promise.all(requests).then((resp) => {
        const respData = resp.map(r => r.data);
        const [grnDetails] = respData
        setGrnDetails(grnDetails);
      })
        .catch((error) => {
          toast.error(getDefaultError(error?.response?.status));
        })
        .finally(() => setIsLoading(false));
    }
  };
  const getReadyForInspectionItem = (materialId: any) => {
    api.get(GrnUrls.startInspectionItemURL(sourceId , materialId))
        .then(resp => {
            const resdata = resp?.data || {};
            const modalStatus =resdata.modal_status;
            let nextRollDetails = resp.data;
            let skipedBatches = resp.data?.rolls
            if(modalStatus===skippedBatchesKey){
              setSkippedBatches([...skipedBatches]);
              setShowSkippedBatchesModal(true)
            }
            else{
              setReadyForInspectionItem(nextRollDetails);
            }
            setOpenDefectModal(true)
        })
        .catch(error => {
            toast.error(getDefaultError(error?.response?.status));
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

  const materialHeaders = grnDetails?.[grnHeadersKey] || [];
  const getRowCanExpand = (row: any) => {
    const subRows = row?.original?.subRows || [];
    return subRows.length > 0;
  };

  const handleRowRefresh  = (needRefresh: boolean) => {
    if (needRefresh) {
      setIsAllRowsCollapse(false)
      fetchData()
    }
  }

  const handleRowExpand = (row: any) => {
    row.toggleExpanded();
  }
 
  const handleInspectMaterial = (row: any) => {
    setMaterialDetailData(row.original)
    getReadyForInspectionItem(row.original.id)
   
  }

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
              {Object.keys(attachmentDetails).length > 0 ? <Box sx={{ display: 'flex', alignItems: 'right', mt: 1 }}>
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
          );


        } else if (header.value === 'total_expected_quantity') {
          return (
            <>
              <Typography>{props.row?.original?.[header.name]}</Typography>
            </>
          )

        } else if (header.value === 'total_expected_quantity_units') {
          return (
            <>
              <Typography>{props.row?.original?.[header.name]}</Typography>
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

  const updatedMaterialColumns = [{
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
  }, ...MaterialDataColumns,
  {
    accessorKey: "id",
    header: '',
    enableSorting: false,
    enableColumnFilter: false,
    enableGlobalFilter: false,
    cell: ({ row }: any) => (
        <Box sx={{ display: "flex", alignItems: "center" }}>
        {!row.original.qa_inspection_complete && (
          <Tooltip title="Start Inspection">
            <IconButton
              size="small"
              onClick={() => handleInspectMaterial(row)}
              style={{ cursor: "pointer" }}
            >
              {currentState=='qa_verification'&&(
                <FullscreenIcon color='primary' />
              )}
            </IconButton>
          </Tooltip>
        )}
         
        </Box>
    ),
  }]

  useEffect(() => {
    if (sourceId) {
      fetchData();
    }
  }, []);

  const renderSubRow = ({ row }: any) => {
    return <GrnRowDetailsView grnId={sourceId} rowData={row} currentState={currentState} grnType={'fabric_inspection'} setToRefreshData={handleRowRefresh} modalType={'fabric_inspection'} />
  }
  const handleDefectModalClose = (status: any) => {
    setSkippedBatches([])
    setReadyForInspectionItem({})
    setShowSkippedBatchesModal(false)
    setOpenDefectModal(status)
  };
  const handleDefectSaveModalClose = (status: any) => {
    setOpenDefectModal(status)
    fetchData()
  };


  return (
    <>
    {openDefectModal &&(
      <DefectDetails 
        openModal={openDefectModal} 
        closeModalData={handleDefectModalClose} 
        handleCloseDefectSave={handleDefectSaveModalClose}
        rowDetails={readyForInspectionItem } 
        rowHeaders={ materialDetailData?.material_headers?.filter((header: { is_visible: any; }) => header.is_visible)}
        rollId={readyForInspectionItem?.id} 
        currentState={currentState}
        grnId={sourceId} 
        materialId={materialDetailData.material_details.user_material_id}
        customerBrandMaterialId={materialDetailData.material_details.customer_brand_material_id}
        grnMaterialId={materialDetailData.id} 
        materialType={materialDetailData.material_details.material_type}
        skippedBatch={skippedBatches}
        showSkippedBatchesModal={showSkippedBatchesModal}
        modalType={'fabric_inspection'}
        />
    )}

      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
          <RitzTable
            columns={updatedMaterialColumns}
            data={grnDetails?.supplier_po_grn_material_set}
            getRowCanExpand={getRowCanExpand}
            renderSubComponent={(row: any) => renderSubRow({ row: row })}

          />
        </>
      )}
    </>
  );
};

export default FabricInspection;
