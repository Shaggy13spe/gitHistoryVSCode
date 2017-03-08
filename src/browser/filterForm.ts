(function() {
    interface Filter {
        by: string,
        args: string[]
    }

    let $filterView: JQuery;

    (window as any).GITHISTORY.initializeFilterView = function() {
        $filterView = $('#filter-view');

        addEventHandlers();
    };

    function addEventHandlers() {
        $filterView
            .on('change', '#filterBy', updateFilterBy);

        $filterView
            .on('keyup', '#filterArg', updateFilterArgs);

        $filterView
            .on('click', '#applyFilter', applyFilter);

        $filterView
            .on('click', '#resetFilter', resetFilter);
    }

    let filter = <Filter>{};
    function updateFilterBy() {
        filter.by = $('#filterBy').find('option:selected').val();
        $('#filter').val(JSON.stringify(filter));
        $('#applyFilter').attr('href', 'command:git.applyFilter?' + JSON.stringify(filter));
    }

    function updateFilterArgs() {
        filter.args = [];
        filter.args.push($('#filterArg').val());
        $('#filter').val(JSON.stringify(filter));
        $('#applyFilter').attr('href', 'command:git.applyFilter?' + JSON.stringify(filter));
    }

    function applyFilter() {
        $('#applyFilter').click();
    }

    function resetFilter() {
        filter = <Filter>{};
        $('#filter').val('');
        $('#applyFilter').attr('href', 'command:git.applyFilter');
    }
})();