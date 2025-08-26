Rails.application.routes.draw do
  get "quotations/index"
  root "sessions#new"

  # Production House Authentication
  get "login", to: "sessions#new"
  post "login", to: "sessions#create"
  delete "logout", to: "sessions#destroy"

  # Admin Authentication
  get "admin/login", to: "sessions#admin_new"
  post "admin/login", to: "sessions#admin_create"
  delete "admin/logout", to: "sessions#admin_destroy"
  post "admin/dismiss_welcome", to: "sessions#admin_dismiss_welcome"

  # Admin Routes
  namespace :admin do
    get "territories/index"
    get "territories/new"
    get "territories/create"
    get "territories/edit"
    get "territories/update"
    get "territories/destroy"
    get "dashboard", to: "dashboard#index"
    get "profile", to: "profile#show"
    patch "profile/update_password", to: "profile#update_password"
    patch "profile/update_email", to: "profile#update_email"
    patch "profile/update_banking", to: "profile#update_banking"
    resources :support_requests, only: [:index, :show, :update]
    resources :settings, only: [ :index, :edit, :update, :create, :destroy ] do
      collection do
        patch :bulk_update
      end
    end
    resources :production_houses
    resources :territories do
      collection do
        patch :bulk_update
      end
    end
    resources :quotations, only: [ :index, :show ] do
      member do
        get :pdf
      end
    end
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
  resources :support_requests, only: [:create, :new]

  # API endpoints for dynamic forms (to be added)
  namespace :api do
    namespace :v1 do
      resources :territories, only: [ :index ]
      resources :settings, only: [ :index ]
    end
  end
end
