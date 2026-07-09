import DefaultLoader from '@/components/DefaultLoader'
import { getDefaultError } from '@/helpers/Utilities';
import api from '@/services/api';
import * as RestUrls from '@/helpers/constants/rest_urls/MaterialAdministrationUrls';
import { Link, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import { editMaterialDetailOptionsURL } from '@/helpers/constants/front_end/AdminUrls';
import NextLink from 'next/link';

const MaterialOptions = () => {

  const columns: ColumnDef<any>[] = [
    {
      accessorFn: (row) => row.label,
      header: 'Field Name ',
      cell: props => (
        <Link component={NextLink} href={editMaterialDetailOptionsURL(props.row.original.material_id, props.row.original.id)}>{props.row.original.label}</Link>
      ),
    }, {
      accessorKey: 'material_label',
      header: 'Material Name',
    }
  ]

  const [isLoading, setIsLoading] = useState(true);
  const [materialOptions, setMaterialOptions] = useState<any>([]);

  const fetchMaterialOptions = () => {
    setIsLoading(true);
    api.get(RestUrls.materialOptionListURL()).then(resp => {
      const resdata = resp?.data || [];
      setMaterialOptions([...resdata]);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };
  useEffect(() => {
    fetchMaterialOptions();
  }, []);

  return (
    <>
      <Typography variant='h1' sx={{ mb: 0 }}>Material Options</Typography>
      {isLoading ? <DefaultLoader /> : <>
        <RitzTable
          data={materialOptions}
          columns={columns}
        />
      </>}
    </>
  )
}

export default MaterialOptions