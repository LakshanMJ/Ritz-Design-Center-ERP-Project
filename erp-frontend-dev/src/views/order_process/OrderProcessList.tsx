import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardActionArea, CardContent, Grid, IconButton, Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import DefaultLoader from "../../components/DefaultLoader";
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import RitzModal from "@/components/Ritz/RitzModal";
import DetailView from "./DetailView";
import api from "@/services/api";
import { costingOrderProcessListURL, searchOrderCostingURL, searchPoClubListURL, searchPurchaseOrderListURL } from "@/helpers/constants/RestUrls";
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import { useRouter } from "next/router";
import CheckIcon from '@mui/icons-material/Check';
import DifferenceIcon from '@mui/icons-material/Difference';
import CostingDifferents from "./CostingDifferents";
import SearchIcon from '@mui/icons-material/Search';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import RitzSearchableSelection from "@/components/Ritz/RitzSearchableSelection";
import SaveSpinner from "@/components/SaveSpinner";
import { orderSummaryVersionURL } from "@/helpers/constants/FrontEndUrls";
import { purchaseOrderDetailsPageURL } from "@/helpers/constants/front_end/POUrls";
import RitzSearchableServerRender from "@/components/Ritz/RitzSearchableServerRender";
import CircularLoader from "@/components/CircularLoader";

const OrderProcessList = () => {
  const keyHelper = new ReactKeyHelper();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isCircularLoader, setIsCircularLoader] = useState(false);
  const [openCostingDifferentModal, setOpenCostingDifferentModal] = useState(false);
  const [openPoClubDetailModal, setOpenPoClubDetailModal] = useState({ modalStatus: false, selectedClubId: null });
  const [orderProcessData, setOrderProcessData] = useState<any>({})
  const [metaDataSet, setMetaDataSet] = useState<any>({})
  const [selectedSearchValues, setSelectedSearchValues] = useState<any>({})
  const [isFiltering, setIsFiltering] = useState(false)

  const fetchData = (url: any) => {
    const apiCall = url ? api.get(url) : api.get(costingOrderProcessListURL(selectedSearchValues?.costing_version_id || '', selectedSearchValues?.purchase_order_id || '', selectedSearchValues?.po_club_id || ''));
    apiCall
      .then((resp: any) => {
        const orderProcessData = resp.data;
        setOrderProcessData({ ...orderProcessData });
      })
      .catch((error: any) => {
        toast.error(getDefaultError(error?.response?.status));
      })
      .finally(() => {
        setIsLoading(false);
        setIsCircularLoader(false)
      });
  };

  const handleCardClick = (label: string, selectedOrderId: any, selectedVersionId: any) => {
    if (label === "order" || label === "marketing") {
      window.open(orderSummaryVersionURL(selectedOrderId, selectedVersionId), "_blank");
    }
  };

  const handleOpenClubDetailModal = (status: any, clubId: any) => {
    setOpenPoClubDetailModal({ modalStatus: status, selectedClubId: clubId });
  };

  const handleSearchTextValue = (selectValue: any, feild: any) => {
    setSelectedSearchValues((prevState: any) => ({
      ...prevState,
      [feild]: selectValue || '',
    }));
  }
  const handleFilterToggle = () => {
    setSelectedSearchValues({})
    setIsFiltering((prev) => !prev);
  }

  useEffect(() => {
    fetchData(null);
  }, []);

  return (
    <>
      {isCircularLoader && (<CircularLoader />)}
      {openCostingDifferentModal && (
        <RitzModal
          open={openCostingDifferentModal}
          onClose={() => setOpenCostingDifferentModal(false)}
          title="Costing Differents"
          maxWidth="lg"
        >
          <CostingDifferents />
        </RitzModal>
      )}
      {openPoClubDetailModal?.modalStatus && (
        <RitzModal
          open={openPoClubDetailModal?.modalStatus}
          onClose={() => setOpenPoClubDetailModal({ modalStatus: false, selectedClubId: null })}
          title="View Details"
          maxWidth="md"
        >
          <DetailView clubId={openPoClubDetailModal?.selectedClubId} />
        </RitzModal>
      )}
      <Typography variant="h1">Order Process</Typography>
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Tooltip title={isFiltering ? "Remove Filter" : "Filter"} arrow>
              <IconButton size="small" color="primary" onClick={handleFilterToggle}>
                {isFiltering ? <FilterAltOffIcon /> : <FilterAltIcon />}
              </IconButton>
            </Tooltip>
          </Box>
          {isFiltering && (
            <Box
              sx={{
                mt: 1,
                mb: 1,
                p: 2,
                border: '1px solid',
                borderColor: 'grey.300',
                borderRadius: 1,
              }}
            >
              <Grid container alignItems="center" spacing={4}>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography>Marketing Costing NO :</Typography>
                  <RitzSearchableServerRender
                    id={"costing"}
                    name={"costing"}
                    optionValue={"id"}
                    optionText={"display_number"}
                    selectedValue={selectedSearchValues.costing_version_id}
                    isRequired={true}
                    handleOnChange={(value: any) => { handleSearchTextValue(value, 'costing_version_id'); }}
                    optionUrl={(searchtext: string) => searchOrderCostingURL(searchtext)}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <Typography>Customer PO NO :</Typography>
                  <RitzSearchableServerRender
                    id={"po"}
                    name={"po"}
                    optionValue={"id"}
                    optionText={"name"}
                    selectedValue={selectedSearchValues.purchase_order_id}
                    isRequired={true}
                    handleOnChange={(value: any) => { handleSearchTextValue(value, 'purchase_order_id'); }}
                    optionUrl={(searchtext: string) => searchPurchaseOrderListURL(searchtext)}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <Typography>PO Club NO :</Typography>
                  <RitzSearchableServerRender
                    id={"po_club"}
                    name={"po_club"}
                    optionValue={"id"}
                    optionText={"display_number"}
                    selectedValue={selectedSearchValues.po_club_id}
                    isRequired={true}
                    handleOnChange={(value: any) => { handleSearchTextValue(value, 'po_club_id'); }}
                    optionUrl={(searchtext: string) => searchPoClubListURL(searchtext)}
                  />
                </Grid>
                <Grid item xs={12} sm={12} md={4} display="flex" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    sx={{ mr: 2 }}
                    onClick={() => { setIsCircularLoader(true); fetchData(null) }}
                  > <SearchIcon /> Search</Button>
                </Grid>
              </Grid>
            </Box>
          )}
          <TableContainer component={Paper} sx={{ maxHeight: "80vh", overflow: "auto" }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#F1F2F4' }}>
                  <TableCell sx={{ textAlign: "center" }}>Order No</TableCell>
                  <TableCell sx={{ textAlign: "center" }}>Tech Pack</TableCell>
                  <TableCell sx={{ textAlign: "center" }}>Marketing Costing</TableCell>
                  <TableCell sx={{ textAlign: "center" }}>PO Club</TableCell>
                  <TableCell sx={{ textAlign: "center" }}>POs</TableCell>
                  <TableCell sx={{ textAlign: "center" }}>Pre-Costing</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orderProcessData?.results?.map((order: any, orderIndex: number) => (
                  order?.costing_versions?.length === 0 ? (
                    <TableRow key={`order-${orderIndex}`}>
                      <TableCell
                        sx={{
                          border: (theme) => `1px solid ${theme.palette.grey[300]}`,
                          width: "15%",
                          backgroundColor: "#F1F2F4",
                        }}
                      >
                        <CardActionArea>
                          <Card
                            sx={{
                              background: "linear-gradient(135deg,rgb(255, 255, 255),rgb(255, 255, 255))",
                              boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.2)",
                            }}
                          >
                            <CardContent>
                              <Typography variant="h6" sx={{ color: "#555555" }}>
                                {order?.short_code}
                              </Typography>
                            </CardContent>
                          </Card>
                        </CardActionArea>
                      </TableCell>
                      <TableCell
                        sx={{
                          border: (theme) => `1px solid ${theme.palette.grey[300]}`,
                          width: "10%",
                          backgroundColor: "#F1F2F4",
                        }}
                      >
                        {order?.tech_packs?.length === 0 ? (
                          <Alert severity='info' >No Available Tech Pack</Alert>
                        ) : (
                          <CardActionArea>
                            <Card
                              sx={{
                                background: "linear-gradient(135deg,rgb(255, 255, 255),rgb(255, 255, 255))",
                                boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.2)",
                              }}
                            >
                              <CardContent>
                                <Typography variant="h6" sx={{ fontWeight: "bold", color: "#555555" }}>
                                  {order?.tech_packs?.map((techPack: any, index: number) => (
                                    <>
                                      <Link
                                        key={techPack.id}
                                        href={techPack.file_path}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        sx={{
                                          color: "#1976d2",
                                          textDecoration: "none",
                                          "&:hover": { textDecoration: "underline" },
                                          display: "inline-block",
                                          marginRight: 1,
                                        }}
                                      >
                                        {techPack.display_name}
                                      </Link>
                                      {index < order?.tech_packs?.length - 1 && ","}
                                    </>
                                  )) || "No Tech Packs"}
                                </Typography>
                              </CardContent>
                            </Card>
                          </CardActionArea>
                        )}
                      </TableCell>
                      <TableCell colSpan={4} sx={{ border: (theme) => `1px solid ${theme.palette.grey[300]}`, backgroundColor: "#F1F2F4" }}>
                        <Alert severity="info">No Available Costing Versions</Alert>
                      </TableCell>
                    </TableRow>
                  ) : (
                    order?.costing_versions?.map((version: any, versionIndex: number) => (
                      version?.po_clubs?.length === 0 ? (
                        <TableRow key={`order-${orderIndex}-version-${versionIndex}`}>
                          <TableCell
                            sx={{
                              border: (theme) => `1px solid ${theme.palette.grey[300]}`,
                              width: "15%",
                              backgroundColor: "#F1F2F4",
                            }}
                          >
                            <CardActionArea onClick={() => handleCardClick("order", order?.id, version?.id)}>
                              <Card
                                sx={{
                                  background: "linear-gradient(135deg,rgb(255, 255, 255),rgb(255, 255, 255))",
                                  boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.2)",
                                }}
                              >
                                <CardContent>
                                  <Typography variant="h6" sx={{ color: "#555555" }}>
                                    {order?.short_code}
                                  </Typography>
                                </CardContent>
                              </Card>
                            </CardActionArea>
                          </TableCell>
                          <TableCell
                            sx={{
                              border: (theme) => `1px solid ${theme.palette.grey[300]}`,
                              width: "5%",
                              backgroundColor: "#F1F2F4",
                            }}
                          >
                            {order?.tech_packs?.length === 0 ? (
                              <Alert severity='info' >No Available Tech Pack</Alert>
                            ) : (
                              <CardActionArea>
                                <Card
                                  sx={{
                                    background: "linear-gradient(135deg,rgb(255, 255, 255),rgb(255, 255, 255))",
                                    boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.2)",
                                  }}
                                >
                                  <CardContent>
                                    <Typography variant="h6" sx={{ fontWeight: "bold", color: "#555555" }}>
                                      {order?.tech_packs?.map((techPack: any, index: number) => (
                                        <>
                                          <Link
                                            key={techPack.id}
                                            href={techPack.file_path}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            sx={{
                                              color: "#1976d2",
                                              textDecoration: "none",
                                              "&:hover": { textDecoration: "underline" },
                                              display: "inline-block",
                                              marginRight: 1,
                                            }}
                                          >
                                            {techPack.display_name}
                                          </Link>
                                          {index < order?.tech_packs?.length - 1 && ","}
                                        </>
                                      )) || "No Tech Packs"}
                                    </Typography>
                                  </CardContent>
                                </Card>
                              </CardActionArea>
                            )}
                          </TableCell>
                          <TableCell
                            sx={{
                              border: (theme) => `1px solid ${theme.palette.grey[300]}`,
                              width: "30%",
                              backgroundColor: "#F1F2F4",
                            }}
                          >
                            <Tooltip title={version?.display_number || ""}>
                              <CardActionArea onClick={() => handleCardClick("marketing", order?.id, version?.id)}>
                                <Card
                                  sx={{
                                    background: "linear-gradient(135deg,rgb(255, 255, 255),rgb(255, 255, 255))",
                                    boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.2)",
                                  }}
                                >
                                  <CardContent>
                                    <Typography variant="body1" sx={{ fontWeight: "bold", color: "#555555" }}>
                                      {version?.short_code}
                                    </Typography>
                                  </CardContent>
                                </Card>
                              </CardActionArea>
                            </Tooltip>
                          </TableCell>
                          <TableCell colSpan={3} sx={{ border: (theme) => `1px solid ${theme.palette.grey[300]}`, backgroundColor: "#F1F2F4" }}>
                            <Alert severity="info">No Available PO Clubs</Alert>
                          </TableCell>
                        </TableRow>
                      ) : (
                        version?.po_clubs?.map((poClub: any, poClubIndex: number) =>
                          poClub?.purchase_orders?.map((po: any, poIndex: number) => (
                            <TableRow key={`order-${orderIndex}-version-${versionIndex}-poClub-${poClubIndex}-po-${poIndex}`}>
                              {poClubIndex === 0 && poIndex === 0 && (
                                <>
                                  <TableCell
                                    sx={{
                                      border: (theme) => `1px solid ${theme.palette.grey[300]}`,
                                      width: "15%",
                                      backgroundColor: "#F1F2F4",
                                    }}
                                    rowSpan={version?.po_clubs?.reduce((acc: number, club: any) => acc + club?.purchase_orders?.length, 0)}
                                  >
                                    <CardActionArea onClick={() => handleCardClick("order", order?.id, version?.id)}>
                                      <Card
                                        sx={{
                                          background: "linear-gradient(135deg,rgb(255, 255, 255),rgb(255, 255, 255))",
                                          boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.2)",
                                        }}
                                      >
                                        <CardContent>
                                          <Typography variant="h6" sx={{ fontWeight: "bold", color: "#555555" }}>
                                            {order?.short_code}
                                          </Typography>
                                        </CardContent>
                                      </Card>
                                    </CardActionArea>
                                  </TableCell>
                                  <TableCell
                                    sx={{
                                      border: (theme) => `1px solid ${theme.palette.grey[300]}`,
                                      width: "10%",
                                      backgroundColor: "#F1F2F4",
                                    }}
                                    rowSpan={version?.po_clubs?.reduce((acc: number, club: any) => acc + club?.purchase_orders?.length, 0)}
                                  >
                                    {order?.tech_packs?.length === 0 ? (
                                      <Alert severity='info' >No Available Tech Pack</Alert>
                                    ) : (
                                      <CardActionArea>
                                        <Card
                                          sx={{
                                            background: "linear-gradient(135deg,rgb(255, 255, 255),rgb(255, 255, 255))",
                                            boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.2)",
                                          }}
                                        >
                                          <CardContent>
                                            <Typography variant="h6" sx={{ fontWeight: "bold", color: "#555555" }}>
                                              {order?.tech_packs?.map((techPack: any, index: number) => (
                                                <>
                                                  <Link
                                                    key={techPack.id}
                                                    href={techPack.file_path}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    sx={{
                                                      color: "#1976d2",
                                                      textDecoration: "none",
                                                      "&:hover": { textDecoration: "underline" },
                                                      display: "inline-block",
                                                      marginRight: 1,
                                                    }}
                                                  >
                                                    {techPack.display_name}
                                                  </Link>
                                                  {index < order?.tech_packs?.length - 1 && ","}
                                                </>
                                              )) || "No Tech Packs"}
                                            </Typography>
                                          </CardContent>
                                        </Card>
                                      </CardActionArea>
                                    )}
                                  </TableCell>
                                </>
                              )}
                              {poClubIndex === 0 && poIndex === 0 && (
                                <TableCell
                                  sx={{
                                    border: (theme) => `1px solid ${theme.palette.grey[300]}`,
                                    width: "30%",
                                    backgroundColor: "#F1F2F4",
                                  }}
                                  rowSpan={version?.po_clubs?.reduce((acc: number, club: any) => acc + club?.purchase_orders?.length, 0)}
                                >
                                  <Tooltip title={version?.display_number || ""}>
                                    <CardActionArea onClick={() => handleCardClick("marketing", order?.id, version?.id)}>
                                      <Card
                                        sx={{
                                          background: "linear-gradient(135deg,rgb(255, 255, 255),rgb(255, 255, 255))",
                                          boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.2)",
                                        }}
                                      >
                                        <CardContent>
                                          <Typography variant="body1" sx={{ fontWeight: "bold", color: "#555555" }}>
                                            {version?.short_code}
                                          </Typography>
                                        </CardContent>
                                      </Card>
                                    </CardActionArea>
                                  </Tooltip>
                                </TableCell>
                              )}
                              {poIndex === 0 && (
                                <TableCell
                                  sx={{
                                    border: (theme) => `1px solid ${theme.palette.grey[300]}`,
                                    backgroundColor: "#F1F2F4",
                                  }}
                                  rowSpan={poClub?.purchase_orders?.length}
                                >
                                  {poClub?.is_single_po ? (
                                    <Alert severity='info' >No Available PO Club</Alert>
                                  ) : (
                                    <CardActionArea onClick={() => handleOpenClubDetailModal(true, poClub?.id)}>
                                      <Card
                                        sx={{
                                          background: "linear-gradient(135deg,rgb(255, 255, 255),rgb(255, 255, 255))",
                                          boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.2)",
                                        }}
                                      >
                                        <CardContent>
                                          <Typography variant="h6" sx={{ fontWeight: "bold", color: "#555555" }}>
                                            {poClub?.short_code}
                                          </Typography>
                                        </CardContent>
                                      </Card>
                                    </CardActionArea>
                                  )}

                                </TableCell>
                              )}
                              <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[300]}`, backgroundColor: "#F1F2F4" }}>
                                <CardActionArea onClick={() => handleOpenClubDetailModal(true, poClub?.id)}>
                                  <Card
                                    sx={{
                                      background: "linear-gradient(135deg,rgb(255, 255, 255),rgb(255, 255, 255))",
                                      boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.2)",
                                    }}
                                  >
                                    <CardContent>
                                      <Typography variant="body1" sx={{ fontWeight: "bold", color: "#555555" }}>
                                        {po?.short_code}
                                      </Typography>
                                    </CardContent>
                                  </Card>
                                </CardActionArea>
                              </TableCell>
                              {poIndex === 0 && (
                                <TableCell
                                  sx={{
                                    border: (theme) => `1px solid ${theme.palette.grey[300]}`,
                                    backgroundColor: "#F1F2F4",
                                  }}
                                  rowSpan={poClub?.purchase_orders?.length}
                                >
                                  {poClub?.pre_costing?.id ? (
                                    <Tooltip title={poClub?.pre_costing?.short_code || ""}>
                                      <CardActionArea onClick={() => { handleCardClick('order', poClub?.pre_costing?.order_id, poClub?.pre_costing?.id) }}>
                                        <Card
                                          sx={{
                                            background: "linear-gradient(135deg,rgb(255, 255, 255),rgb(255, 255, 255))",
                                            color: "#fff",
                                            boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.2)",
                                          }}
                                        >
                                          <CardContent>
                                            <Typography variant="body1" sx={{ fontWeight: "bold", color: "#555555" }}>{poClub?.pre_costing?.short_code}</Typography>
                                          </CardContent>
                                        </Card>
                                      </CardActionArea>
                                    </Tooltip>
                                  ) : (
                                    <Alert severity='info' >No Available Pre-Costing</Alert>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                        )
                      )
                    ))
                  )
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {orderProcessData?.previous && (
                <Button variant="contained" onClick={() => { setIsCircularLoader(true); fetchData(orderProcessData?.previous) }}>Previous</Button>
              )}
              {orderProcessData?.next && (
                <Button variant="contained" sx={{ ml: 2 }} onClick={() => { setIsCircularLoader(true); fetchData(orderProcessData?.next) }} >Next</Button>
              )}
            </Box>
          </Box>
        </>

      )}
    </>
  );
};

export default OrderProcessList;