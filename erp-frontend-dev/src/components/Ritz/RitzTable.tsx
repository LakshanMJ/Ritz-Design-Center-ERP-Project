import React, { useEffect, useMemo, useState } from 'react';
import {
    Column,
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
    FilterFn,
    ColumnFiltersState,
    getSortedRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFacetedMinMaxValues,
    RowData,
    RowSelectionState,
    ExpandedState,
    getExpandedRowModel,
    SortingState,
} from '@tanstack/react-table';
import { RankingInfo, rankItem } from '@tanstack/match-sorter-utils';
import {
    Box,
    Card,
    IconButton,
    TableBody,
    TableCell,
    TableContainer,
    Table,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Input,
    Autocomplete,
    TableCellProps,
    Popper,
    ClickAwayListener,
    Badge,
    Paper,
    Checkbox,
    TablePagination,
    Typography,
    Button,
    alpha,
    TableFooter,
    useTheme,
    Chip,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { RxCaretSort, RxCaretUp, RxCaretDown } from 'react-icons/rx';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import SaveSpinner from '../SaveSpinner';


declare module '@tanstack/table-core' {
    interface FilterFns {
        fuzzy: FilterFn<unknown>,
        multiselect: FilterFn<unknown>,
        basic: FilterFn<unknown>
    }
    interface FilterMeta {
        itemRank: RankingInfo
    }
    interface ColumnMeta<TData extends RowData, TValue> {
        width?: string | number,
        align?: TableCellProps['align'],
        header?: {
            value?: string
        }
    }
}

function ColumnFilter({
    column,
    columnFilters,
    serverSideRendering,
    setServerFilters
}: {
    column: Column<any, unknown>,
    columnFilters: ColumnFiltersState,
    serverSideRendering: boolean
    setServerFilters: any
}) {
    const [selectedOptions, setSelectedOptions] = useState([]);
    const [columnLabel, setColumnLabel] = useState<any>('');

    const sortedUniqueValues = useMemo(() => {
        const unique = Array.from(column.getFacetedUniqueValues().keys());
        const sorted = unique.sort();
        return sorted.filter(value => value?.toString());
    }, [column.getFacetedUniqueValues()]);

    const getOptionLabel = (option: any) => {
        return option?.toString() || '';
    }

    const onInputChange = (value: any, reason: string) => {
        const filters = reason === 'clear' || !value || !value?.length ? [] : Array.isArray(value) ? value : [value];
        setSelectedOptions(filters);
        column.setFilterValue(!filters.length ? '' : filters);
    }

    const onTextChange = (event: any) => {
        const field = column.id;
        const value = event.target.value;

        column.setFilterValue(value);
        setServerFilters((prevFilters: any) => ({
            ...prevFilters,
            [field]: value
        }));
    }

    useEffect(() => {
        setColumnLabel(column.columnDef.header || column.id);
        const filters: any = columnFilters.find((f: any) => f.id === column.id)?.value;
        if (filters?.length > 0) {
            setSelectedOptions(filters);
        } else {
            setSelectedOptions([]);
        }
    }, [columnFilters]);

    return (
        serverSideRendering ? 
        <TextField
            size='small'
            variant='outlined'
            label={columnLabel}
            value={selectedOptions}
            onChange={(e) => onTextChange(e)}
            sx={{
                mb: 2,
                width: '100%'
            }}
        /> :
        <Autocomplete
            size='small'
            multiple
            disableCloseOnSelect
            id={column.id}
            options={sortedUniqueValues}
            getOptionLabel={getOptionLabel}
            value={selectedOptions}
            onInputChange={(e, v, r) => onInputChange(v, r)}
            onChange={(e, v, r) => onInputChange(v, r)}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={column.columnDef.header.toString()}
                    // placeholder={`${column.columnDef.header} (${sortedUniqueValues.length})`}
                />
            )}
            renderOption={(props, option, { selected }) => (
                <li {...props} key={`${column.id}_${option}`}>
                    <Checkbox
                        key={`ch-${column.id}_${option}`}
                        icon={<CheckBoxOutlineBlankIcon fontSize='small'/>}
                        checkedIcon={<CheckBoxIcon fontSize='small'/>}
                        checked={selected}
                        sx={{
                            mr: 1
                        }}
                    />
                    {option}
                </li>
            )}
            renderTags={(tagValue, getTagProps) => (
                tagValue.map((option, index) => {
                    const { key, ...rest } = getTagProps({ index });
                    return (
                        <Chip
                            key={key}
                            label={option}
                            {...rest}
                        />
                    );
                })
            )}
            sx={{
                mt: 2,
                mb: 1
            }}
        />
    )
}

function ColumnSearch({ column }: { column: Column<any, unknown> }) {
    const columnFilterValue = column.getFilterValue();
  
    // const sortedUniqueValues = useMemo(() => Array.from(column.getFacetedUniqueValues().keys()).sort(), [column.getFacetedUniqueValues()]);
 
    const sortedUniqueValues = useMemo(() => {
        const unique = Array.from(column.getFacetedUniqueValues().keys());
        const sorted = unique.sort();
        return sorted.filter(value => value?.toString());
    }, [column.getFacetedUniqueValues()]);

    const onInputChange = (value: string, reason: string) => {
        if (reason === 'clear') {
            column.setFilterValue('');
        } else {
            column.setFilterValue(value);
        }
    }

    return (
        <Autocomplete
            fullWidth
            size='small'
            freeSolo
            options={sortedUniqueValues.map(value => value?.toString())}
            onInputChange={(e, v, r) => onInputChange(v, r)}
            renderInput={(params) => 
                <TextField
                    {...params}
                    value={(columnFilterValue ?? '') as string}
                    placeholder={`Search... (${column.getFacetedUniqueValues().size})`}
                />
            }
        />
    )
}

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
    // Rank the item
    const itemRank = rankItem(row.getValue(columnId), value);
  
    // Store the itemRank info
    addMeta({
      itemRank,
    });
  
    // Return if the item should be filtered in/out
    return itemRank.passed;
}

const multiFilter: FilterFn<any> = (row, columnId, values: any[], addMeta) => {
    return values.includes(row.getValue(columnId));
}

const basicSearch: FilterFn<any> = (row, columnId, value, addMeta) => {
    const cellValue = (row.getValue(columnId)?.toString() || '').toLowerCase();
    const filterValue = (value || '').toLowerCase();
    return cellValue.includes(filterValue);
}

const RitzTable: React.FC<any> = ({
    title,
    data,
    columns,
    tableRef,
    size='medium',
    enableGlobalFilter=true,
    enableColumnFilter=true,
    columnFilterMode='filter',  // 'filter' for dropdown filter or 'search' for text search
    rowSelect=false,
    multiRowSelect=false,
    border=true,
    pagination=true,
    hideFilters=false,
    hideSorting=false,
    getRowCanExpand,
    subRowSelect=false,
    renderSubComponent,
    onRowSelect,
    headerStyle,
    // --- Server side pagination --- 
    serverSideRendering=false, // TODO rename to serverSidePagination
    totalCount=0,
    onSearchTextChange, // TODO rename to onGlobalSearch
    onFilterSearch,
    onPageNumberChange, // TODO rename to onPageIndexChange
    onPerPageCountChange,   // TODO rename to on PageSizeChange
    onSortingChange,
    isLoading=false,
    defaultExpanded = false,  //default expanded state
    // ------------------------------
}) => {
    const themeName = (useTheme() as any)?.['name'];
    const [globalSearchToggled, setGlobalSearchToggled] = useState(false);
    const [globalFilter, setGlobalFilter] = useState('');

    const [columnSearchToggled, setColumnSearchToggled] = useState(false);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const filterOpen = Boolean(anchorEl);
    const filterId = filterOpen ? 'simple-popper' : undefined;

    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const effectiveGlobalFilter = !serverSideRendering ? globalFilter : '';
    const [serverFilters, setServerFilters] = useState({});
    const [sorting, setSorting] = useState<SortingState>([]);

    const table = useReactTable({
        data,
        columns,
        filterFns: {
            fuzzy: fuzzyFilter,
            multiselect: multiFilter,
            basic: basicSearch
        },
        state: {
            columnFilters,
            globalFilter: effectiveGlobalFilter,
            rowSelection,
            expanded,
            sorting
        },
        defaultColumn: {
            filterFn: columnFilterMode === 'filter' ? 'multiselect' : 'basic'
        },
        initialState: {
            pagination: {
                pageSize: 50
            }
        },
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        onSortingChange: setSorting,
        onExpandedChange: setExpanded,
        globalFilterFn: fuzzyFilter,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: serverSideRendering ? undefined : getFilteredRowModel(),
        getSortedRowModel: serverSideRendering ? undefined : getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        getFacetedMinMaxValues: getFacetedMinMaxValues(),
        getExpandedRowModel: getExpandedRowModel(),
        getRowCanExpand: row => getRowCanExpand(row),
        enableRowSelection: rowSelect,
        enableMultiRowSelection: multiRowSelect,
        enableSubRowSelection: subRowSelect,
        onRowSelectionChange: setRowSelection,
        manualPagination: serverSideRendering ? true : !pagination,
        manualFiltering: serverSideRendering,
        manualSorting: serverSideRendering,
        enableSorting: !hideSorting,
    });

    if (tableRef) { // useRef in parent to access table props. TODO revisit
        tableRef.current = {
            getSelectedRows: () => {
                return rowSelection;
            },
            selectedRows: rowSelection,
            setPageIndex: (pageIndex: number) => table.setPageIndex(pageIndex),
        }
    }

    if (onRowSelect) {
        useEffect(() => {
            onRowSelect(rowSelection);
        }, [rowSelection]);
    }

    const { pageSize, pageIndex } = table.getState().pagination;

    const onClickGlobalSearch = () => {
        setGlobalSearchToggled(!globalSearchToggled);
    }

    const onClickColumnSearch = () => {
        setColumnSearchToggled(!columnSearchToggled);
    }
    
    const onClickColumnFilter = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(anchorEl ? null : event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const clearFilters = () => {
        table.resetColumnFilters();
        setServerFilters([]);
    }

    const onCellClick = (event: React.MouseEvent<HTMLElement>, row: any) => {
        const target = event.target as HTMLElement;
        if (rowSelect && target.tagName === 'TD') {
            row.toggleSelected();
        }
    }

    const onSort = (event: any, header: any) => {
        header.column.getToggleSortingHandler()(event);

        const sortOrder: any = {
            'asc': 'desc',
            'desc': false,
            false: 'asc'
        };

        if (serverSideRendering) {
            const sortCol = header.column.id;
            const currSort = sorting.find(i => i.id === sortCol);
            const currSortDir: any = currSort ? (currSort.desc ? 'desc' : 'asc') : false;
            const nextSortDir = sortOrder[currSortDir];

            if (!nextSortDir) {
                // Reset sort state
                setSorting([]);
            } else {
                setSorting([{ id: sortCol, desc: nextSortDir === 'desc' }]);
            }
            
            onSortingChange({ column: sortCol, direction: nextSortDir });
        }
    }

    useEffect(() => {
        if (defaultExpanded && data?.length > 0) {
          const expandedRows: Record<string, boolean> = {};
          data.forEach((_: any, index: string | number) => {
            expandedRows[index] = true;
          });
          setExpanded(expandedRows);
        }
    }, [defaultExpanded, data]);

    return (
        <>
        {data && (
            <>
            {(title || enableGlobalFilter || enableColumnFilter) && <Box sx={{ width: '100%', mb: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ fontSize: 'small', display: 'flex', justifyContent: 'start', alignItems: 'center' }}>
                    {(title && typeof title === 'string') ? <Typography variant='h6' fontWeight={'normal'}>{title}</Typography> : (
                        title
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {globalSearchToggled && (
                        <>
                            <Input
                                size='small'
                                autoFocus
                                value={globalFilter ?? ''}
                                onChange={e => {setGlobalFilter(String(e.target.value))}}
                                placeholder='Search'
                                sx={{
                                    mr: 0.5,
                                    '& .MuiInputBase-input': {
                                        background: 'none'
                                    }
                                }}
                            />
                            {serverSideRendering && (
                                <Button
                                    size='small'
                                    variant='outlined'
                                    sx={{ mr: 2, ml: 0.5 }}
                                    onClick={() => onSearchTextChange(globalFilter)}
                                    disabled={isLoading}
                                >
                                    Search
                                </Button>
                            )}
                        </>
                    )}
                    
                    {!hideFilters && (
                        <>
                        {enableGlobalFilter && <Tooltip title='Search table'>
                            <IconButton onClick={onClickGlobalSearch}>
                                <Badge color='primary' variant='dot' invisible={globalFilter ? false : true}>
                                    <SearchIcon fontSize='small' color={globalFilter ? 'primary' : 'inherit' } />
                                </Badge>
                            </IconButton>
                        </Tooltip>}

                        {(enableColumnFilter && columnFilterMode==='search') && <Tooltip title='Search columns'>
                            <IconButton onClick={onClickColumnSearch}>
                                <Badge color='primary' variant='dot' invisible={columnFilters.length > 0 ? false : true}>
                                    <ManageSearchIcon fontSize='small' color={columnFilters.length > 0 ? 'primary' : 'inherit' } />
                                </Badge>
                            </IconButton>
                        </Tooltip>}

                        {(enableColumnFilter && columnFilterMode==='filter') && <Tooltip title='Filter'>
                            <IconButton aria-describedby={filterId} onClick={onClickColumnFilter}>
                                <Badge color='primary' variant='dot' invisible={!columnFilters.length}>
                                    <FilterListIcon fontSize='small' color={columnFilters.length > 0 ? 'primary' : 'inherit'} />
                                </Badge>
                            </IconButton>
                        </Tooltip>}

                        {/* Filter popup */}
                        <Popper
                            id={filterId}
                            open={filterOpen}
                            anchorEl={anchorEl}
                            disablePortal
                            placement='bottom-end'
                            sx={{
                                zIndex: (theme) => theme.zIndex.modal,
                            }}
                        >
                            <ClickAwayListener onClickAway={handleClose}>
                                <Paper
                                    sx={{
                                        pl: 2,
                                        pr: 1,
                                        py: 1,
                                        width: '500px',
                                        maxHeight: '80%',
                                        overflowY: 'auto'
                                    }}
                                >
                                    <Box
                                        sx={{
                                            mb: 1,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <Typography variant='h6' sx={{ display: 'inline' }}>Filters</Typography>
                                            <Button
                                                size='small'
                                                sx={{
                                                    mx: 1
                                                }}
                                                onClick={clearFilters}
                                                disabled={!columnFilters.length}
                                            >Reset</Button>
                                        </Box>
                                        <IconButton size='small' onClick={handleClose}><CloseIcon fontSize='inherit'/></IconButton>
                                    </Box>
                                    <Box sx={{ pr: 1, mt: 2 }}>
                                        {table.getHeaderGroups().map((headerGroup, i) => (
                                            <div key={`filter-${i}`}>
                                                {headerGroup.headers.map((header, i2) => {
                                                    return (
                                                        <div key={`filter2-${i2}`}>
                                                            {header.isPlaceholder ? null : (
                                                                header.column.getCanFilter() && (
                                                                    <ColumnFilter 
                                                                        column={header.column} 
                                                                        columnFilters={columnFilters} 
                                                                        serverSideRendering={serverSideRendering} 
                                                                        setServerFilters={setServerFilters} 
                                                                    />
                                                                )
                                                            )}
                                                        </div>
                                                )})}
                                            </div>
                                        ))}
                                    </Box>
                                    {serverSideRendering && (
                                        <Button 
                                            variant='outlined' 
                                            size='small' 
                                            sx={{ my: 1 }}
                                            disabled={isLoading}
                                            onClick={() => onFilterSearch(serverFilters)}
                                        >
                                            Apply Filter
                                        </Button>
                                    )}
                                </Paper>
                            </ClickAwayListener>
                        </Popper>
                        </>
                    )}                    
                </Box>
            </Box>}
            <TableContainer
                component={Card}
                variant={themeName === 'theme2' || !border ? 'outlined' : 'elevation'}
                sx={{
                    border: (theme) => (border && themeName === 'theme2') ? `1px solid ${theme.palette.divider}` : 'none'
                }}
            >
                <Table size={size}>
                    <TableHead>
                        {table.getHeaderGroups().map((headerGroup, i) => (
                            <React.Fragment key={i}>
                                <TableRow key={`h-${i}`}>
                                    {headerGroup.headers.map((header, i2) => {
                                        return (
                                            <TableCell
                                                key={`h2-${i2}`}
                                                colSpan={header.colSpan}
                                                align={header.column.columnDef.meta?.align ?? 'left'}
                                                sx={{
                                                    ...headerStyle,
                                                    p: 0,
                                                    width: header.column.columnDef.meta?.width ?? 'auto'
                                                }}
                                            >
                                                {header.isPlaceholder ? null : (
                                                    <Box
                                                        sx={header.column.getCanSort() ? {
                                                            cursor: (header.column.getCanSort() && !isLoading) ? 'pointer' : 'default',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            px: 2,
                                                            py: size === 'small' ? 1 : 2
                                                        } : {
                                                            px: 2,
                                                            py: size === 'small' ? 1 : 2
                                                        }}
                                                        // onClick={header.column.getToggleSortingHandler()}
                                                        //onClick={e => onSort(e, header)}
                                                        onClick={!hideSorting && header.column.getCanSort() ? e => onSort(e, header) : undefined}
                                                    >
                                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                                        {header.column.getCanSort() && <Box sx={{ ml: 0.5, minWidth: '18px', minHeight: '18px', display: 'flex' }}>
                                                            {{
                                                                asc: <RxCaretUp fontSize='medium' />,
                                                                desc: <RxCaretDown fontSize='medium' />
                                                            }[header.column.getIsSorted() as string] ?? <RxCaretSort fontSize='medium' opacity={0.6} />}
                                                        </Box>}
                                                    </Box>
                                                )}
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>

                                {columnSearchToggled && <TableRow key={`hs-${i}`}>
                                    {headerGroup.headers.map((header, i2) => {
                                        return (
                                            <TableCell
                                                key={`hs2-${i2}`}
                                                colSpan={header.colSpan}
                                                align={header.column.columnDef.meta?.align ?? 'left'}
                                                sx={{
                                                    p: 0,
                                                    width: header.column.columnDef.meta?.width ?? 'auto',
                                                    // background: (theme) => theme.palette.grey[50]
                                                }}
                                            >
                                                {(!header.isPlaceholder && header.column.getCanFilter()) && (
                                                    <Box
                                                        sx={{
                                                            p: 0.5
                                                        }}
                                                    >
                                                        <ColumnSearch column={header.column} />
                                                    </Box>
                                                )}
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>}
                            </React.Fragment>
                        ))}
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow hover>
                                <TableCell colSpan={table.getAllFlatColumns().length} sx={{ textAlign: 'center' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <SaveSpinner/>Loading....
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.length > 0 ? table.getRowModel().rows.map((row, i) => {
                                return (
                                    <React.Fragment key={`tr-${i}`}>
                                        <TableRow
                                            key={`${i}-${row.id}`}
                                            hover
                                            sx={{
                                                '&:nth-of-type(odd)': {
                                                    backgroundColor: (theme) => row.getIsSelected() ? 'rgba(25, 118, 210, 0.08)' : alpha(theme.palette.grey[50], 0.4),
                                                },
                                                cursor: rowSelect ? 'pointer' : 'inherit'
                                            }}
                                            selected={rowSelect && row.getIsSelected()}
                                            onClick={(e) => onCellClick(e, row)}
                                        >
                                            {row.getVisibleCells().map((cell, i2) => {
                                                return (
                                                    <TableCell key={`${i2}-${cell.id}`} align={cell.column.columnDef.meta?.align ?? 'left'}>
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
    
                                        {(row.getIsExpanded() && renderSubComponent) && (
                                            <TableRow>
                                                <TableCell/>
                                                <TableCell colSpan={row.getVisibleCells().length-1} sx={{ p: 0 }}>
                                                    {renderSubComponent({ row })}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                )
                            }) : (
                                <TableRow hover>
                                    <TableCell colSpan={table.getAllFlatColumns().length} sx={{ textAlign: 'center' }}>
                                        No results found.
                                    </TableCell>
                                </TableRow>
                            )
                        )}
                    </TableBody>
                    {pagination && (
                        <TableFooter>
                            <TableRow>
                                <TablePagination
                                    colSpan={table.getAllFlatColumns().length}
                                    rowsPerPageOptions={[
                                        50, 
                                        100, 
                                        500,  
                                        // { label: 'All', value: data.length }
                                    ]}
                                    count={serverSideRendering ? totalCount : table.getFilteredRowModel().rows.length}
                                    rowsPerPage={pageSize}
                                    page={pageIndex}
                                    showFirstButton
                                    showLastButton
                                    SelectProps={{
                                        inputProps: {
                                            'aria-label': 'rows per page',
                                        },
                                        MenuProps: {
                                            PaperProps: {
                                                // variant: 'outlined',
                                                // elevation: 0
                                            }
                                        }
                                    }}
                                    onPageChange={(_, page) => {
                                        table.setPageIndex(page);
                                        if (serverSideRendering) {
                                            onPageNumberChange(page);
                                        }
                                    }}
                                    onRowsPerPageChange={e => {
                                        const size = e.target.value ? Number(e.target.value) : 50;
                                        if (serverSideRendering) {
                                            onPerPageCountChange(size);
                                        }
                                        table.setPageSize(size);
                                    }}
                                    sx={{
                                        mr: 1,
                                        borderBottom: 0
                                    }}
                                />
                            </TableRow>
                        </TableFooter>
                    )}
                </Table>
            </TableContainer>
            </>
        )}
        </>
    )
}

export default RitzTable;