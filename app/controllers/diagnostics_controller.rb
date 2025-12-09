class DiagnosticsController < ApplicationController
  skip_before_action :check_mobile_device, only: [:territories]

  def territories
    @total_territories = Territory.count
    @individual_territories = Territory.where(group_name: nil).order(:name)
    @territory_groups = Territory.where.not(group_name: nil).group_by(&:group_name)

    render html: "<html><head><title>Territory Diagnostics</title></head><body style='font-family: monospace; padding: 20px;'>
      <h1>🔍 Territory Database Diagnostics</h1>

      <h2>Summary</h2>
      <p><strong>Total Territories:</strong> #{@total_territories}</p>
      <p><strong>Individual Territories (group_name: nil):</strong> #{@individual_territories.count}</p>
      <p><strong>Territory Groups:</strong> #{@territory_groups.keys.count}</p>

      <h2>Individual Territories (#{@individual_territories.count})</h2>
      <ul>
        #{@individual_territories.map { |t| "<li>#{t.name} - #{t.percentage}% (ID: #{t.id}, media_type: #{t.media_type})</li>" }.join}
      </ul>

      <h2>Territory Groups</h2>
      #{@territory_groups.map { |group_name, territories|
        "<h3>#{group_name} (#{territories.count} territories)</h3>
        <ul>#{territories.map { |t| "<li>#{t.name} - #{t.percentage}%</li>" }.join}</ul>"
      }.join}

      <hr>
      <p style='color: #666;'>Generated at: #{Time.current}</p>
    </body></html>".html_safe
  end
end
