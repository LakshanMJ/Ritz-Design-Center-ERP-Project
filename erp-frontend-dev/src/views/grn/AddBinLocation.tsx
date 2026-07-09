import React, { useEffect, useState } from 'react';
import { formatAmount, getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Box, Button, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Tooltip} from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import api from '@/services/api';
import * as GrnUrls from '../../helpers/constants/rest_urls/GrnUrls';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import CustomerBrandMaterialDetail from "../settings/userdefine_material/MaterialDetail";
import RitzToolTip from '@/components/Ritz/RitzTooltip';
import RitzSearchableServerRender from '@/components/Ritz/RitzSearchableServerRender';
import { warehouseBinLocationListURL } from '../../helpers/constants/rest_urls/GrnUrls';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
const AddBinLocation = ({ grnId, refreshData }: any) => {
  const keyHelper = new ReactKeyHelper();
  const [isLoading, setIsLoading] = useState(true);
  const [grnDetails, setGrnDetails] = useState<any>({});
  const [showMaterialDetailsModal, setShowMaterialDetailsModal] = useState({ modalStatus: null, materialId: null });

  const materialColumns: ColumnDef<any>[] = [
    {
      accessorKey: "supplier_id",
      header: '',
      cell: ({ row, getValue }) => (
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
        width: 95,
      },
    },
    {
      accessorKey: 'material_details?.material_label',
      header: 'Material',
      cell: ({ row }) => {
        const rowData = row.original;
        return (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {rowData?.material_details?.material_label}
          </Box>
        );
      },
    },
    {
      accessorKey: 'material_details?.ritz_customer_brand_reference_code',
      header: 'Ritz Reference Code',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const rowData = row.original;
        return (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {rowData?.material_details?.ritz_customer_brand_reference_code}
            <RitzToolTip materialHeaders={rowData?.material_headers} materialDetails={rowData?.material_details} />
          </Box>
        );
      },
    },
    {
      accessorKey: 'total_actual_quantity_units',
      header: 'Total Expected Quantity',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const rowData = row.original;
        return (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {formatAmount(rowData?.total_actual_quantity)} {rowData?.total_actual_quantity_units}
          </Box>
        );
      },
    },
    {
      accessorKey: 'grn_price',
      header: 'GRN Price',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const rowData = row.original;
        return (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {formatAmount(rowData?.grn_price)}
          </Box>
        );
      },
    },
  ]

  const handleRowExpand = (row: any) => {
    row.toggleExpanded();
  }
  
  const fetchData = () => {
    if (grnId > 0) {
      setIsLoading(true);
      const requests = [
        api.get(GrnUrls.grnBasicDetailsURL(grnId)),
      ]
      Promise.all(requests).then((resp) => {
        const respData = resp.map(r => r.data);
        const [grnDetails] = respData
        setGrnDetails({ ...grnDetails });

      })
        .catch((error) => {
          toast.error(getDefaultError(error?.response?.status));
        })
        .finally(() => setIsLoading(false));
    }
  };

  const handleSaveChanges = () => {
    const request = {
      method: 'post',
      url: GrnUrls.grnBinLocationSaveURL(grnId),
      data: grnDetails?.supplierpogrnmaterial_set?.map((materialRow: any) => ({
        id: materialRow.id || null,
        supplierpogrnmaterialdetail_set: materialRow.supplierpogrnmaterialdetail_set?.map((detailRow: any) => ({
          id: detailRow.id || null,
          bin_location: detailRow.bin_location_id || null,
        })),
      }))
    };
    api(request).then((resp) => {
      const resdata = resp?.data || [];
      toast.success(DEFAULT_SUCCESS);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally();
  }
  const getRowCanExpand = (row: any) => {
    const subRows = row?.original?.supplierpogrnmaterialdetail_set || [];
    return subRows.length > 0;
  };
  const handleChangeBinLocation = (selectedLocation: any, mainRowIndex: number, subRowIndex: number) => {
    setGrnDetails((prev: any) => {
      const updated = { ...prev };
      updated.supplierpogrnmaterial_set[mainRowIndex].supplierpogrnmaterialdetail_set[subRowIndex].bin_location_id = selectedLocation;
      return updated;
    });
  };
  const handleCopyBinLocation = (binLocation: any, mainRowIndex: number) => {
    if (!grnDetails) return;
    const updatedGrnDetails = {...grnDetails,
      supplierpogrnmaterial_set: grnDetails.supplierpogrnmaterial_set?.map((materialRow: any, index: number) => {
        if (index === mainRowIndex && materialRow.supplierpogrnmaterialdetail_set) {
          const updatedSubRows = materialRow.supplierpogrnmaterialdetail_set.map((detail: any) => ({
            ...detail,
            bin_location_id: binLocation,
          }));
          return {
            ...materialRow,
            supplierpogrnmaterialdetail_set: updatedSubRows,
          };
        }
        return materialRow;
      }),
    };
    setGrnDetails(updatedGrnDetails);
  };

  const renderSubRow = ({ row }: any) => {
    const mainData = row?.original;
    const subRows = row?.original.supplierpogrnmaterialdetail_set || [];
    return (
      <>
        <Table
          size="small"
          sx={{
            borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
            '& .MuiTableCell-head': {
              color: (theme) => theme.palette.grey[700],
              background: (theme) => theme.palette.grey[50],
            },
          }}
        >
          <TableHead>
            <TableRow>
              {mainData?.material_details?.material_type === 'fabric' && (
                <>
                  <TableCell>Roll No</TableCell>
                  <TableCell>Batch</TableCell>
                </>
              )}
              <TableCell>Barcode</TableCell>
              <TableCell>Actual Quantity</TableCell>
              <TableCell>Bin Location</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {subRows.length > 0 ? (
              subRows.map((roll: any, index: number) => (
                <TableRow
                  key={index}
                  sx={{
                    '&:last-child td, &:last-child th': {
                      border: 0,
                    },
                    marginTop: '10px',
                    marginBottom: '10px'
                  }}
                >
                  {mainData?.material_details?.material_type === 'fabric' && (
                    <>
                      <TableCell>{roll?.pack_number ?? "--"}</TableCell>
                      <TableCell>{roll?.batch_number?.display_value ?? "--"}</TableCell>
                    </>
                  )}
                  <TableCell>{roll?.barcode ?? "--"}</TableCell>
                  <TableCell>{formatAmount(roll?.actual_quantity)} {roll?.actual_quantity_units?.display_value}</TableCell>
                  <TableCell>
                    <RitzSearchableServerRender
                      id={"bin_location_id"}
                      name={"bin_location_id"}
                      optionValue={"id"}
                      optionText={"display_number"}
                      selectedValue={roll?.bin_location_id}
                      isRequired={true}
                      handleOnChange={(selectedOrderID: any) => handleChangeBinLocation(selectedOrderID, row.index, index)}
                      optionUrl={(searchtext: string) => warehouseBinLocationListURL(searchtext, (roll?.bin_location_id && !searchtext) ? roll?.bin_location_id : null)}
                      initialOptions={roll?.bin_location_id ? [roll?.bin_location] : []}
                    />
                  </TableCell>
                  <TableCell>
                    {roll?.bin_location && (
                      <Tooltip title="Copy Bin Location" arrow>
                        <IconButton
                          size="small"
                          onClick={() => { handleCopyBinLocation(roll?.bin_location_id, row.index)}}
                          style={{ cursor: "pointer" }}>
                          <ContentCopyIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} sx={{ textAlign: 'center', marginTop: '5px', marginBottom: '5px' }}>
                  <Box>There is nothing to show on material details.</Box>
                </TableCell>
              </TableRow>
            )}

          </TableBody>
        </Table>
      </>
    );
  };

  useEffect(() => {
    if (grnId) {
      fetchData();
    }
  }, []);

  return (
    <>
      {showMaterialDetailsModal.modalStatus &&
        <CustomerBrandMaterialDetail
          customerBrandMaterialReferenceCodeId={showMaterialDetailsModal?.materialId}
          modalOpen={showMaterialDetailsModal?.modalStatus}
          setModalOpen={() => { setShowMaterialDetailsModal({ modalStatus: false, materialId: null }) }}
        />
      }
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
          <Box>
            <RitzTable
              columns={materialColumns}
              data={grnDetails?.supplierpogrnmaterial_set}
              getRowCanExpand={getRowCanExpand}
              renderSubComponent={renderSubRow}
              pagination={false}
              enableGlobalFilter={false}
              enableColumnFilter={false}
              defaultExpanded={true}
            />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Button variant="outlined" onClick={() => { handleSaveChanges() }} >Save</Button>
          </Box>
        </>
      )}
    </>
  );
};

export default AddBinLocation;
