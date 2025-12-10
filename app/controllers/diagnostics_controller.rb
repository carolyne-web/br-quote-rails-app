class DiagnosticsController < ApplicationController
  skip_before_action :check_mobile_device, only: [:territories, :media_exceptions]

  def media_exceptions
    @exceptions = TerritoryMediaException.all.order(:territory_name, :media_type)
    @exceptions_by_territory = @exceptions.group_by(&:territory_name)

    render html: "<html><head><title>Media Exceptions Diagnostics</title></head><body style='font-family: monospace; padding: 20px;'>
      <h1>🔍 Territory Media Exceptions Database</h1>

      <h2>Summary</h2>
      <p><strong>Total Exceptions:</strong> #{@exceptions.count}</p>
      <p><strong>Territories with Exceptions:</strong> #{@exceptions_by_territory.keys.count}</p>

      <h2>All Exceptions</h2>
      #{@exceptions_by_territory.map { |territory_name, exceptions|
        "<h3>#{territory_name} (#{exceptions.count} exceptions)</h3>
        <ul>
          #{exceptions.map { |ex|
            "<li><strong>#{ex.media_type_label}</strong>: #{ex.percentage}% | Created: #{ex.created_at.strftime('%Y-%m-%d %H:%M')} | ID: #{ex.id}</li>"
          }.join}
        </ul>"
      }.join}

      <hr>
      <p style='color: #666;'>Generated at: #{Time.current}</p>
    </body></html>".html_safe
  end

  def territories
    @total_territories = Territory.count
    @individual_territories = Territory.where(group_name: nil).order(:name)
    @territory_groups = Territory.where.not(group_name: nil).group_by(&:group_name)
    @old_individual_territories = Territory.where(group_name: "Individual Territories")

    render html: "<html><head><title>Territory Diagnostics</title></head><body style='font-family: monospace; padding: 20px;'>
      <h1>🔍 Territory Database Diagnostics</h1>

      <h2>Summary</h2>
      <p><strong>Total Territories:</strong> #{@total_territories}</p>
      <p><strong>Individual Territories (group_name: nil):</strong> #{@individual_territories.count}</p>
      <p><strong>Territory Groups:</strong> #{@territory_groups.keys.count}</p>
      <p><strong>Expected Individual Territories:</strong> 52</p>

      #{if @old_individual_territories.any?
        "<div style='background: #fff3cd; padding: 15px; margin: 20px 0; border: 2px solid #856404; border-radius: 5px;'>
          <h2 style='color: #856404; margin-top: 0;'>⚠️ OLD Manually Created Territories</h2>
          <p><strong>Found #{@old_individual_territories.count} territories with group_name = 'Individual Territories'</strong></p>
          <p style='color: #856404;'>These were manually created via admin panel (not from seeds/migrations):</p>
          <ul style='color: #856404;'>
            #{@old_individual_territories.map { |t|
              "<li><strong>#{t.name}</strong> - #{t.percentage}% | ID: #{t.id} | Created: <strong>#{t.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')}</strong> | Updated: #{t.updated_at.strftime('%Y-%m-%d %H:%M:%S UTC')}</li>"
            }.join}
          </ul>
          <p style='color: red; font-weight: bold;'>⚠️ These should probably be deleted as you have the correct ones below!</p>
        </div>"
      else
        ""
      end}

      <h2>Individual Territories (#{@individual_territories.count})</h2>
      <ul>
        #{@individual_territories.map { |t| "<li>#{t.name} - #{t.percentage}% (ID: #{t.id}, media_type: #{t.media_type}, created: #{t.created_at.strftime('%Y-%m-%d %H:%M')})</li>" }.join}
      </ul>

      <h2>Territory Groups</h2>
      #{@territory_groups.map { |group_name, territories|
        "<h3>#{group_name} (#{territories.count} territories)</h3>
        <ul>#{territories.map { |t| "<li>#{t.name} - #{t.percentage}% (ID: #{t.id}, created: #{t.created_at.strftime('%Y-%m-%d %H:%M')})</li>" }.join}</ul>"
      }.join}

      <hr>
      <p style='color: #666;'>Generated at: #{Time.current}</p>
    </body></html>".html_safe
  end
end
