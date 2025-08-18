Rails.application.routes.draw do
  root 'sessions#new'

  # Production House Authentication
  get 'login', to: 'sessions#new'
  post 'login', to: 'sessions#create'
  delete 'logout', to: 'sessions#destroy'

  # Admin Authentication
  get 'admin/login', to: 'sessions#admin_new'
  post 'admin/login', to: 'sessions#admin_create'
  delete 'admin/logout', to: 'sessions#admin_destroy'

  # Admin Routes
  namespace :admin do
    get 'dashboard', to: 'dashboard#index'
    resources :settings, only: [:index, :edit, :update] do
      collection do
        patch :bulk_update
      end
    end
    resources :production_houses
    resources :territories
  end

  # Production House Routes (to be added in next steps)
  resources :quotations do
    member do
      get :pdf
      post :duplicate
    end
    resources :talent_categories
    resources :quotation_territories
    resources :quotation_adjustments
  end

  # API endpoints for dynamic forms (to be added)
  namespace :api do
    namespace :v1 do
      resources :territories, only: [:index]
      resources :settings, only: [:index]
    end
  end
end
