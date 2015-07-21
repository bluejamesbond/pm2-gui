var AppActions = Reflux.createActions([
    'systemInfoUpdated'
]);

var SystemInfoStore = Reflux.createStore({
    listenables: [AppActions],
    stats: {},
    init: function () {
        io('/sys').on('system_stat', this._setStat);
    },
    _setStat: function (stats) {
        if (!_.isEqual(this.stats, stats)) {

            stats.date = new Date();

            if (Array.isArray(stats.cpus) && stats.cpus.length) {
                stats.cpus = stats.cpus[0].model;
            }

            if (stats.cpu) {
                stats['cpu usage'] = stats.cpu + '%';
                delete stats.cpu;
            }

            if (typeof stats.memory === 'object') {
                stats['free memory'] = (stats.memory.free / 1024 / 1024).toFixed(2) + ' MB';
                stats['memory usage'] = stats.memory.percentage + '%';
                stats['total memory'] = (stats.memory.total / 1024 / 1024).toFixed(2) + ' MB';
                delete stats.memory;
            }

            this.stats = stats;

            AppActions.systemInfoUpdated(stats);
        }
    },
    getStats: function () {
        return this.stats;
    }
});

var SystemInfoItem = React.createClass({
    getInitialState: function () {
        return {};
    },
    shouldComponentUpdate: function (nextProps) {
        return this.props.value !== nextProps.value || this.props._key !== nextProps._key;
    },
    componentDidUpdate: function () {
        this._triggerHighlight();
    },
    componentDidMount: function () {
        this._triggerHighlight();
    },
    _triggerHighlight: function () {
        var $valueText = $(React.findDOMNode(this.refs.valueText));

        $valueText.addClass('yellow');

        clearTimeout(this.colorTid);
        this.colorTid = setTimeout(function () {
            $valueText.removeClass('yellow');
        }, 800);
    },
    render: function () {
        return (
            <tr>
                <td className='key'>
                    <div className="h3 text gray left b uppercase spacing ellipses">{this.props._key}</div>
                </td>
                <td className='value'>
                    <div ref='valueText' className="h1 text gray left ellipses yellow">{this.props.value}</div>
                </td>
            </tr>
        )
    }
});

var SystemInfo = React.createClass({
    mixins: [Reflux.listenTo(AppActions.systemInfoUpdated, 'onSystemInfoUpdated')],
    getInitialState: function () {
        return {stats: {}};
    },
    onSystemInfoUpdated: function (stats) {
        this.setState({stats: stats});
    },
    render: function () {

        return (
            <div className='full'>
                <table>
                    <thead>
                    <tr>
                        <th>Property</th>
                        <th>Value</th>
                    </tr>
                    </thead>
                    <tbody>{_.map(this.state.stats, function (value, key) {
                        if (key === 'date') return;
                        return <SystemInfoItem key={key} value={value} _key={key}/>
                    })}</tbody>
                </table>
            </div>
        )
    }
});

var GraphContainer = React.createClass({
    mixins: [Reflux.listenTo(AppActions.systemInfoUpdated, 'onSystemInfoUpdated')],
    onSystemInfoUpdated: function (stats) {
        var entry = {date: stats.date};
        entry[this.props.metric] = Number(stats[this.props.metric].replace(/[^0-9\.]/g, ''));
        this.data.push(entry);

        if(!this.addedListener){

            var chart = this.chart;
            var data = this.data;

            chart.addListener("dataUpdated", function () {
                var offset = Math.max(Math.min(data.length, 10), 1);
                console.log(Math.max(data.length - offset, 0), Math.max(data.length - 1, 0), data.length);
                chart.zoomToIndexes(Math.max(data.length - offset, 0), Math.max(data.length - 1, 0));
            });

            this.addedListener = true;
        }

        this.chart.validateData();
    },
    shouldComponentUpdate: function () {
        return false;
    },
    componentDidMount: function () {

        this.data = [];

        this.chart = AmCharts.makeChart(React.findDOMNode(this.refs.graph), {
            "type": "serial",
            "theme": "black",
            'autoMarginOffset': 5,
            "dataProvider": this.data,
            "valueAxes": [{
                "dashLength": 1,
                "position": "left"
            }],
            "graphs": [{
                "id": "g1",
                "title": this.props.metric.toUpperCase(),
                "type": "smoothedLine",
                "lineColor": this.props.color,
                "fillColors": this.props.color,
                "lineThickness": 2,
                "fillAlphas": 0.4,
                "valueField": this.props.metric,
                "balloonText": '<div class="balloon"><div class="value">[[value]]</div><div class="title">[[title]]</div></div>'
            }],
            chartScrollbar: {
                "graph": "g1",
                "scrollbarHeight": 20,
                "backgroundAlpha": 0,
                "selectedBackgroundAlpha": 0.3,
                "selectedBackgroundColor": "#888888",
                "graphFillAlpha": 0.2,
                "graphLineAlpha": 0.0,
                "selectedGraphFillAlpha": 0.1,
                'dragIconHeight': 20,
                "autoGridCount": true,
                'dragIconWidth': 20,
                "selectedGraphLineAlpha": 0,
                "color": "#888"
            },
            "chartCursor": {
                "valueLineEnabled": true,
                "valueLineBalloonEnabled": true,
                "valueLineAlpha": 0.5,
                "fullWidth": true,
                "cursorAlpha": 0.05
            },
            "categoryField": "date",
            "categoryAxis": {
                "parseDates": true,
                "minPeriod": '1ss'
            },
            "legend": {}
        });
    },
    render: function () {
        return (
            <div className="full-abs amchart" ref='graph'></div>
        )
    }
});

var App = React.createClass({
    getInitialState: function () {
        return {};
    },
    render: function () {
        return (
            <div className='full flex'>
                <div className='box'>
                    <div className='full flex vertical'>
                        <div className="full">
                            <GraphContainer metric='memory usage' color="#02A0F1"/>
                        </div>
                        <div className="full" style={{borderTop:'1px solid rgba(255,255,255,0.2)'}}>
                            <GraphContainer metric='cpu usage' color="#11EA00"/>
                        </div>
                        <div className="full" style={{borderTop:'1px solid rgba(255,255,255,0.2)'}}>
                            <GraphContainer metric='free memory' color="#D721EC"/>
                        </div>
                    </div>
                </div>
                <div className='box sys-info' style={{borderLeft:'1px solid rgba(255,255,255,0.1)',background:'#111'}}>
                    <SystemInfo />
                </div>
            </div>
        );
    }
});

React.render(
    <App />,
    document.getElementById('body')
);

